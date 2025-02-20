#!/bin/bash

# Startup Metrics Benchmarking Platform - Database Backup Script
# Version: 1.0.0
# Dependencies:
# - postgresql-client v14
# - aws-cli v2.0+

set -euo pipefail

# Global Configuration
BACKUP_DIR="/var/lib/postgresql/backups"
S3_BUCKET="startup-metrics-backups"
RETENTION_DAYS=30
LOG_FILE="/var/log/postgresql/backup.log"
MAX_RETRIES=3
BACKUP_TIMEOUT=3600
MIN_BACKUP_SIZE=1048576
DISK_SPACE_THRESHOLD=85

# Load database configuration from environment
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

# Extract database connection details
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')

# Function: Structured logging with monitoring integration
log_backup_status() {
    local message="$1"
    local status="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "[${timestamp}] [${status}] ${message}" >> "${LOG_FILE}"
    
    # Alert on critical events
    if [[ "${status}" == "ERROR" ]]; then
        # TODO: Implement alert mechanism (e.g., SNS, email)
        echo "[ALERT] Backup error occurred: ${message}" >&2
    fi
}

# Function: Verify prerequisites and environment
check_prerequisites() {
    local error_count=0

    # Check required tools
    for cmd in pg_dump aws openssl; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            log_backup_status "Required command not found: ${cmd}" "ERROR"
            ((error_count++))
        fi
    done

    # Verify backup directory
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        if ! mkdir -p "${BACKUP_DIR}"; then
            log_backup_status "Unable to create backup directory: ${BACKUP_DIR}" "ERROR"
            ((error_count++))
        fi
    fi

    # Check disk space
    local disk_usage
    disk_usage=$(df -h "${BACKUP_DIR}" | awk 'NR==2 {print $5}' | sed 's/%//')
    if ((disk_usage > DISK_SPACE_THRESHOLD)); then
        log_backup_status "Disk space critical: ${disk_usage}% used" "ERROR"
        ((error_count++))
    fi

    # Verify S3 bucket access
    if ! aws s3 ls "s3://${S3_BUCKET}" >/dev/null 2>&1; then
        log_backup_status "Unable to access S3 bucket: ${S3_BUCKET}" "ERROR"
        ((error_count++))
    fi

    return "${error_count}"
}

# Function: Create encrypted backup
create_backup() {
    local backup_type="$1"
    local timestamp=$(date -u +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/backup_${backup_type}_${timestamp}.sql.gz.enc"
    local temp_file="${backup_file}.tmp"
    local start_time=$(date +%s)
    local encryption_key
    
    # Generate random encryption key
    encryption_key=$(openssl rand -hex 32)
    
    # Create backup with timeout protection
    if ! timeout "${BACKUP_TIMEOUT}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-acl \
        2>/dev/null | openssl enc -aes-256-cbc -salt -k "${encryption_key}" > "${temp_file}"; then
        log_backup_status "Backup creation failed" "ERROR"
        rm -f "${temp_file}"
        return 1
    fi

    # Verify backup size
    local backup_size
    backup_size=$(stat -f%z "${temp_file}")
    if ((backup_size < MIN_BACKUP_SIZE)); then
        log_backup_status "Backup file too small: ${backup_size} bytes" "ERROR"
        rm -f "${temp_file}"
        return 1
    fi

    # Calculate checksum and move to final location
    local checksum
    checksum=$(sha256sum "${temp_file}" | cut -d' ' -f1)
    mv "${temp_file}" "${backup_file}"
    
    # Store encryption key and checksum securely
    echo "${encryption_key} ${checksum}" | aws s3 cp - "s3://${S3_BUCKET}/keys/$(basename "${backup_file}").key" --sse aws:kms

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_backup_status "Backup completed: $(basename "${backup_file}") (${backup_size} bytes, ${duration}s)" "INFO"
    echo "${backup_file}"
}

# Function: Upload backup to S3 with retry mechanism
upload_to_s3() {
    local backup_file="$1"
    local retry_count=0
    local max_wait=60

    while ((retry_count < MAX_RETRIES)); do
        if aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/backups/$(basename "${backup_file}")" \
            --storage-class STANDARD_IA \
            --sse aws:kms; then
            log_backup_status "Upload successful: $(basename "${backup_file}")" "INFO"
            return 0
        fi

        ((retry_count++))
        local wait_time=$((2 ** retry_count))
        ((wait_time > max_wait)) && wait_time=${max_wait}
        
        log_backup_status "Upload failed, retrying in ${wait_time}s (attempt ${retry_count}/${MAX_RETRIES})" "WARN"
        sleep "${wait_time}"
    done

    log_backup_status "Upload failed after ${MAX_RETRIES} attempts: $(basename "${backup_file}")" "ERROR"
    return 1
}

# Function: Clean up old backups
cleanup_old_backups() {
    local cutoff_date
    cutoff_date=$(date -u -d "${RETENTION_DAYS} days ago" +"%Y%m%d")
    
    # Clean local backups
    find "${BACKUP_DIR}" -type f -name "backup_*" -mtime "+${RETENTION_DAYS}" -exec rm -f {} \;
    
    # Clean S3 backups
    aws s3 ls "s3://${S3_BUCKET}/backups/" | while read -r line; do
        local backup_date
        backup_date=$(echo "${line}" | awk '{print $4}' | grep -o '[0-9]\{8\}')
        if [[ "${backup_date}" < "${cutoff_date}" ]]; then
            local backup_file=$(echo "${line}" | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/backups/${backup_file}"
            aws s3 rm "s3://${S3_BUCKET}/keys/${backup_file}.key"
            log_backup_status "Removed old backup: ${backup_file}" "INFO"
        fi
    done
}

# Main backup function
backup_database() {
    local backup_type="${1:-full}"
    local error_occurred=0

    # Set up error handling
    trap 'error_occurred=1; log_backup_status "Backup script interrupted" "ERROR"' ERR INT TERM

    # Check prerequisites
    if ! check_prerequisites; then
        log_backup_status "Prerequisites check failed" "ERROR"
        return 1
    fi

    # Create backup
    local backup_file
    if ! backup_file=$(create_backup "${backup_type}"); then
        return 1
    fi

    # Upload to S3
    if ! upload_to_s3 "${backup_file}"; then
        return 1
    fi

    # Cleanup if successful
    if ((error_occurred == 0)); then
        cleanup_old_backups
        rm -f "${backup_file}"
    fi

    return "${error_occurred}"
}

# Execute backup if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    backup_database "$@"
fi