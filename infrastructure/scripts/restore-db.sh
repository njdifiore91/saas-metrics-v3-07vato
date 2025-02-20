#!/usr/bin/env bash

# Startup Metrics Benchmarking Platform - Database Restoration Script
# Version: 1.0.0
# Requires: PostgreSQL 14+, AWS CLI 2.0+

set -euo pipefail
IFS=$'\n\t'

# Global configuration
RESTORE_DIR="/var/lib/postgresql/restore"
S3_BUCKET="startup-metrics-backups"
LOG_FILE="/var/log/postgresql/restore.log"
TEMP_DIR="/tmp/db-restore"
SCHEMA_VERSION_FILE="/var/lib/postgresql/schema_version"
MAX_RETRIES=3
PARTITION_BATCH_SIZE=5

# Logging configuration
exec 1> >(tee -a "${LOG_FILE}")
exec 2> >(tee -a "${LOG_FILE}" >&2)

log() {
    local level=$1
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] $*"
}

error() {
    log "ERROR" "$@"
    return 1
}

# Trap errors and cleanup
cleanup() {
    local exit_code=$?
    log "INFO" "Cleaning up temporary resources..."
    rm -rf "${TEMP_DIR}"
    if [[ ${exit_code} -ne 0 ]]; then
        log "ERROR" "Script failed with exit code ${exit_code}"
        # Notify administrators
        if command -v aws >/dev/null 2>&1; then
            aws sns publish \
                --topic-arn "${SNS_TOPIC_ARN:-}" \
                --message "Database restoration failed with exit code ${exit_code}" \
                --subject "DB Restore Failed" || true
        fi
    fi
    exit ${exit_code}
}
trap cleanup EXIT

check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check PostgreSQL version
    local pg_version
    pg_version=$(pg_restore --version | grep -oE '[0-9]+' | head -1)
    if [[ ${pg_version} -lt 14 ]]; then
        error "PostgreSQL version must be 14 or higher"
    fi

    # Verify AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        error "AWS CLI is required but not installed"
    fi

    # Check required environment variables
    local required_vars=("DATABASE_URL" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable ${var} is not set"
        fi
    done

    # Verify directories and permissions
    local required_dirs=("${RESTORE_DIR}" "$(dirname "${LOG_FILE}")")
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "${dir}" ]]; then
            mkdir -p "${dir}" || error "Failed to create directory: ${dir}"
        fi
        if [[ ! -w "${dir}" ]]; then
            error "Directory not writable: ${dir}"
        fi
    done

    return 0
}

validate_schema_compatibility() {
    local backup_file=$1
    local target_schema_version=$2
    log "INFO" "Validating schema compatibility..."

    # Extract schema version from backup
    local backup_schema_version
    backup_schema_version=$(pg_restore -l "${backup_file}" | grep -oP "-- Schema version: \K[0-9]+")
    
    if [[ ${backup_schema_version} -gt ${target_schema_version} ]]; then
        error "Backup schema version (${backup_schema_version}) is newer than target (${target_schema_version})"
    fi

    # Validate core table structures
    local tables=("companies" "users" "metrics" "company_metrics" "benchmark_data")
    for table in "${tables[@]}"; do
        pg_restore --schema-only -t "${table}" "${backup_file}" >/dev/null 2>&1 || \
            error "Invalid table structure for ${table}"
    }

    # Verify enum types
    if ! pg_restore --schema-only -t "pg_type" "${backup_file}" | grep -q "user_role_enum"; then
        error "Missing required enum type: user_role_enum"
    }

    # Validate partitioning scheme
    if ! pg_restore -l "${backup_file}" | grep -q "company_metrics_[0-9]"; then
        log "WARN" "Backup does not contain partitioned tables"
    fi

    return 0
}

handle_partition_restore() {
    local table_name=$1
    local partition_key=$2
    local batch_size=$3
    log "INFO" "Handling partition restore for ${table_name}"

    # Get partition list
    local partitions
    mapfile -t partitions < <(pg_restore -l "${BACKUP_FILE}" | grep -oP "${table_name}_[0-9]+")

    # Process partitions in batches
    local total_partitions=${#partitions[@]}
    local batch_count=$(( (total_partitions + batch_size - 1) / batch_size ))

    for ((i = 0; i < batch_count; i++)); do
        local start_idx=$((i * batch_size))
        local end_idx=$((start_idx + batch_size - 1))
        end_idx=$((end_idx < total_partitions ? end_idx : total_partitions - 1))

        log "INFO" "Restoring partition batch $((i + 1))/${batch_count}"
        
        # Restore batch of partitions
        for ((j = start_idx; j <= end_idx; j++)); do
            local partition=${partitions[j]}
            pg_restore \
                --dbname "${DATABASE_URL}" \
                --jobs 2 \
                --table "${partition}" \
                "${BACKUP_FILE}" || error "Failed to restore partition ${partition}"
            
            # Verify partition data
            psql "${DATABASE_URL}" -c "SELECT count(*) FROM ${partition}" >/dev/null 2>&1 || \
                error "Partition verification failed: ${partition}"
        done

        # Rebuild indexes for batch
        log "INFO" "Rebuilding indexes for partition batch"
        psql "${DATABASE_URL}" -c "REINDEX TABLE ${table_name}" || \
            error "Failed to rebuild indexes for ${table_name}"
    done
}

restore_database() {
    local backup_file=$1
    local target_database=$2
    local -n options=$3

    log "INFO" "Starting database restoration process..."
    
    # Create restoration checkpoint
    local checkpoint_file="${TEMP_DIR}/restore_checkpoint_$(date +%s)"
    mkdir -p "${TEMP_DIR}"
    
    # Download backup if S3 URL provided
    if [[ ${backup_file} =~ ^s3:// ]]; then
        log "INFO" "Downloading backup from S3..."
        aws s3 cp "${backup_file}" "${TEMP_DIR}/backup.dump" || \
            error "Failed to download backup from S3"
        backup_file="${TEMP_DIR}/backup.dump"
    fi

    # Validate backup file
    if [[ ! -f ${backup_file} ]]; then
        error "Backup file not found: ${backup_file}"
    fi

    # Stop dependent services
    if [[ ${options[stop_services]:-false} == true ]]; then
        log "INFO" "Stopping dependent services..."
        systemctl stop startup-metrics-api || log "WARN" "Failed to stop API service"
        sleep 5
    fi

    # Perform schema validation
    validate_schema_compatibility "${backup_file}" "${SCHEMA_VERSION:-0}" || \
        error "Schema validation failed"

    # Drop existing database objects
    log "INFO" "Dropping existing database objects..."
    psql "${DATABASE_URL}" <<-EOF
        DROP SCHEMA IF EXISTS startup_metrics CASCADE;
        CREATE SCHEMA startup_metrics;
EOF

    # Restore base schema
    log "INFO" "Restoring base schema..."
    pg_restore \
        --dbname "${DATABASE_URL}" \
        --schema-only \
        --no-owner \
        --no-privileges \
        "${backup_file}" || error "Failed to restore base schema"

    # Handle partitioned tables
    local partitioned_tables=("company_metrics" "benchmark_data")
    for table in "${partitioned_tables[@]}"; do
        handle_partition_restore "${table}" "period_start" "${PARTITION_BATCH_SIZE}" || \
            error "Failed to restore partitions for ${table}"
    done

    # Restore core data
    log "INFO" "Restoring core data..."
    local core_tables=("companies" "users" "metrics" "benchmark_sources")
    for table in "${core_tables[@]}"; do
        pg_restore \
            --dbname "${DATABASE_URL}" \
            --data-only \
            --table "${table}" \
            "${backup_file}" || error "Failed to restore ${table} data"
    done

    # Verify role-based access control
    log "INFO" "Verifying RBAC data..."
    psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM users WHERE role NOT IN ('COMPANY_USER', 'ANALYST', 'ADMIN')" | \
        grep -q '^[[:space:]]*0' || error "Invalid role values detected"

    # Update schema version
    echo "${SCHEMA_VERSION:-0}" > "${SCHEMA_VERSION_FILE}"

    # Restart services if needed
    if [[ ${options[stop_services]:-false} == true ]]; then
        log "INFO" "Restarting dependent services..."
        systemctl start startup-metrics-api || log "WARN" "Failed to start API service"
    fi

    log "INFO" "Database restoration completed successfully"
    return 0
}

# Main execution
main() {
    local backup_file=${1:-}
    local target_database=${2:-}

    if [[ -z ${backup_file} || -z ${target_database} ]]; then
        error "Usage: $0 <backup_file> <target_database>"
    fi

    check_prerequisites || exit 1

    # Configure restoration options
    declare -A restore_options=(
        [stop_services]=true
        [validate_schema]=true
        [rebuild_indexes]=true
    )

    restore_database "${backup_file}" "${target_database}" restore_options
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi