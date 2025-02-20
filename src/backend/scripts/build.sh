#!/usr/bin/env bash

# Startup Metrics Platform - Docker Build Script
# Version: 1.0.0
# Maintainer: DevOps Team

set -euo pipefail
IFS=$'\n\t'

# Security settings
umask 027
export DOCKER_CONTENT_TRUST=1
export DOCKER_BUILDKIT=1

# Build configuration
readonly SERVICES=("api-gateway" "auth" "metrics" "benchmark")
readonly BUILD_ARGS="--no-cache --pull --security-opt=no-new-privileges"
readonly DOCKER_CONTEXT="../"
readonly LOG_DIR="/var/log/startup-metrics/builds"
readonly BUILD_TIMEOUT=3600
readonly PARALLEL_BUILDS=2
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging configuration
readonly LOG_FILE="${LOG_DIR}/build_${TIMESTAMP}.log"
readonly ERROR_LOG="${LOG_DIR}/build_errors_${TIMESTAMP}.log"
readonly AUDIT_LOG="${LOG_DIR}/build_audit_${TIMESTAMP}.log"

# Security scanning configuration
readonly TRIVY_SEVERITY="HIGH,CRITICAL"
readonly TRIVY_EXIT_CODE=1

# Initialize logging
setup_logging() {
    mkdir -p "${LOG_DIR}"
    touch "${LOG_FILE}" "${ERROR_LOG}" "${AUDIT_LOG}"
    chmod 640 "${LOG_FILE}" "${ERROR_LOG}" "${AUDIT_LOG}"

    # Rotate logs older than 30 days
    find "${LOG_DIR}" -type f -name "*.log" -mtime +30 -delete

    exec 3>&1 4>&2
    exec 1> >(tee -a "${LOG_FILE}") 2> >(tee -a "${ERROR_LOG}" >&2)
}

# Verify Docker environment
check_docker() {
    echo "[INFO] Verifying Docker environment..."
    
    if ! command -v docker &> /dev/null; then
        echo "[ERROR] Docker is not installed" | tee -a "${ERROR_LOG}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo "[ERROR] Docker daemon is not running" | tee -a "${ERROR_LOG}"
        exit 1
    }

    # Verify Docker version compatibility
    local docker_version
    docker_version=$(docker version --format '{{.Server.Version}}')
    if [[ "${docker_version}" < "24.0.0" ]]; then
        echo "[ERROR] Docker version must be 24.0.0 or higher" | tee -a "${ERROR_LOG}"
        exit 1
    }
}

# Verify security tools
check_security_tools() {
    echo "[INFO] Verifying security tools..."
    
    if ! command -v trivy &> /dev/null; then
        echo "[INFO] Installing Trivy scanner..."
        curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.45.0
    }
}

# Build service with security scanning
build_service() {
    local service_name=$1
    local build_start
    build_start=$(date +%s)

    echo "[INFO] Building ${service_name} service..."
    
    # Record build start in audit log
    echo "[AUDIT] Build started for ${service_name} at $(date -u)" >> "${AUDIT_LOG}"

    # Build the service
    if ! docker build \
        ${BUILD_ARGS} \
        --build-arg BUILD_VERSION="${TIMESTAMP}" \
        --build-arg NODE_ENV=production \
        --tag "startup-metrics/${service_name}:${TIMESTAMP}" \
        --tag "startup-metrics/${service_name}:latest" \
        --file "${DOCKER_CONTEXT}/services/${service_name}/Dockerfile" \
        "${DOCKER_CONTEXT}/services/${service_name}"; then
        
        echo "[ERROR] Failed to build ${service_name}" | tee -a "${ERROR_LOG}"
        return 1
    }

    # Security scan
    echo "[INFO] Running security scan for ${service_name}..."
    if ! trivy image \
        --severity "${TRIVY_SEVERITY}" \
        --exit-code "${TRIVY_EXIT_CODE}" \
        --no-progress \
        "startup-metrics/${service_name}:${TIMESTAMP}" \
        > "${LOG_DIR}/${service_name}_security_scan_${TIMESTAMP}.log"; then
        
        echo "[ERROR] Security vulnerabilities found in ${service_name}" | tee -a "${ERROR_LOG}"
        return 1
    }

    local build_end
    build_end=$(date +%s)
    local build_duration=$((build_end - build_start))

    # Record build completion in audit log
    echo "[AUDIT] Build completed for ${service_name} in ${build_duration}s at $(date -u)" >> "${AUDIT_LOG}"
    
    return 0
}

# Setup build environment
setup_build_environment() {
    echo "[INFO] Setting up build environment..."
    
    # Set resource limits
    ulimit -n 65535
    ulimit -u 2048

    # Clear Docker build cache if needed
    if [[ "${BUILD_ARGS}" == *"--no-cache"* ]]; then
        docker builder prune -f
    }

    # Verify disk space
    local available_space
    available_space=$(df -P "${DOCKER_CONTEXT}" | awk 'NR==2 {print $4}')
    if [[ "${available_space}" -lt 10485760 ]]; then  # 10GB in KB
        echo "[ERROR] Insufficient disk space for build" | tee -a "${ERROR_LOG}"
        exit 1
    }
}

# Main build process
main() {
    echo "[INFO] Starting build process at $(date -u)"
    
    setup_logging
    check_docker
    check_security_tools
    setup_build_environment

    local failed_services=()
    
    # Build services in parallel with limit
    for ((i = 0; i < ${#SERVICES[@]}; i += PARALLEL_BUILDS)); do
        local pids=()
        
        # Start parallel builds
        for ((j = i; j < i + PARALLEL_BUILDS && j < ${#SERVICES[@]}; j++)); do
            build_service "${SERVICES[j]}" &
            pids+=($!)
        done

        # Wait for parallel builds to complete
        for pid in "${pids[@]}"; do
            if ! wait "${pid}"; then
                failed_services+=("${SERVICES[i]}")
            fi
        done
    done

    # Report build results
    echo "[INFO] Build process completed at $(date -u)"
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        echo "[ERROR] Failed services: ${failed_services[*]}" | tee -a "${ERROR_LOG}"
        exit 1
    fi

    echo "[INFO] All services built successfully"
    exit 0
}

# Trap for cleanup
cleanup() {
    local exit_code=$?
    echo "[INFO] Cleaning up build environment..."
    
    # Restore file descriptors
    exec 1>&3 2>&4
    
    # Record build completion in audit log
    echo "[AUDIT] Build script completed with exit code ${exit_code} at $(date -u)" >> "${AUDIT_LOG}"
    
    exit "${exit_code}"
}

trap cleanup EXIT

# Execute main process with timeout
timeout "${BUILD_TIMEOUT}" main