#!/bin/bash

# Backend Test Suite Execution Script
# Version: 1.0.0
# Dependencies:
# - jest ^29.6.2
# - lerna ^7.1.4

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly DEFAULT_PARALLEL_WORKERS=4
readonly MIN_COVERAGE_THRESHOLD=80
readonly LOG_DIR="${ROOT_DIR}/logs/test"
readonly ARCHIVE_DIR="${ROOT_DIR}/test-archives"
readonly TEMP_DIR="${ROOT_DIR}/tmp/test"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Error handling function
handle_error() {
    local exit_code=$?
    log_error "An error occurred on line $1"
    cleanup_test_env
    exit $exit_code
}

# Set up error handling
trap 'handle_error ${LINENO}' ERR

# Function to validate dependencies
validate_dependencies() {
    local missing_deps=0

    # Check Jest
    if ! command -v jest &> /dev/null; then
        log_error "Jest is not installed. Please install jest ^29.6.2"
        missing_deps=1
    fi

    # Check Lerna
    if ! command -v lerna &> /dev/null; then
        log_error "Lerna is not installed. Please install lerna ^7.1.4"
        missing_deps=1
    fi

    if [ $missing_deps -ne 0 ]; then
        return 1
    fi
    return 0
}

# Function to set up test environment
setup_test_env() {
    log_info "Setting up test environment..."

    # Export required environment variables
    export NODE_ENV="test"
    export JEST_WORKER_ID=1
    export COVERAGE_DIR="${ROOT_DIR}/coverage"
    export TEST_TIMEOUT=30000

    # Create necessary directories
    mkdir -p "${COVERAGE_DIR}" "${LOG_DIR}" "${ARCHIVE_DIR}" "${TEMP_DIR}"

    # Validate dependencies
    if ! validate_dependencies; then
        log_error "Failed to validate dependencies"
        return 2
    }

    # Set resource limits for parallel execution
    ulimit -n 4096 2>/dev/null || log_warn "Failed to set file descriptor limit"

    # Clear previous coverage reports
    rm -rf "${COVERAGE_DIR:?}"/* 2>/dev/null || true

    log_info "Test environment setup completed"
    return 0
}

# Function to run tests
run_tests() {
    local service_pattern="${1:-services/*}"
    local parallel_workers="${2:-$DEFAULT_PARALLEL_WORKERS}"

    log_info "Starting test execution for pattern: ${service_pattern}"
    log_info "Using ${parallel_workers} parallel workers"

    # Create timestamp for this test run
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local test_run_dir="${LOG_DIR}/${timestamp}"
    mkdir -p "${test_run_dir}"

    # Execute tests with coverage
    jest \
        --config="${ROOT_DIR}/backend/jest.config.ts" \
        --maxWorkers="${parallel_workers}" \
        --coverage \
        --coverageDirectory="${COVERAGE_DIR}" \
        --testPathPattern="${service_pattern}" \
        --verbose \
        --json \
        --outputFile="${test_run_dir}/test-results.json" \
        2>&1 | tee "${test_run_dir}/test.log"

    local test_exit_code=${PIPESTATUS[0]}

    # Check coverage thresholds
    if [ -f "${COVERAGE_DIR}/coverage-summary.json" ]; then
        local coverage_below_threshold=false
        
        # Parse coverage data and check against threshold
        if jq -e ".total.lines.pct < $MIN_COVERAGE_THRESHOLD" "${COVERAGE_DIR}/coverage-summary.json" >/dev/null; then
            coverage_below_threshold=true
        fi

        if [ "${coverage_below_threshold}" = true ]; then
            log_error "Coverage is below the minimum threshold of ${MIN_COVERAGE_THRESHOLD}%"
            test_exit_code=3
        fi
    else
        log_warn "Coverage report not found"
    fi

    # Archive test results
    local archive_file="${ARCHIVE_DIR}/test-results_${timestamp}.tar.gz"
    tar -czf "${archive_file}" -C "${ROOT_DIR}" \
        "coverage" \
        "logs/test/${timestamp}" \
        2>/dev/null || log_warn "Failed to archive test results"

    return $test_exit_code
}

# Function to clean up test environment
cleanup_test_env() {
    log_info "Cleaning up test environment..."

    # Remove temporary files
    rm -rf "${TEMP_DIR:?}"/* 2>/dev/null || true

    # Reset environment variables
    unset NODE_ENV JEST_WORKER_ID COVERAGE_DIR TEST_TIMEOUT

    # Clean up any lingering Jest workers
    pkill -f "jest-worker" || true

    log_info "Cleanup completed"
}

# Main execution
main() {
    local exit_code=0

    # Setup test environment
    if ! setup_test_env; then
        log_error "Failed to set up test environment"
        exit 2
    fi

    # Run tests
    if ! run_tests "$@"; then
        exit_code=$?
        log_error "Test execution failed with exit code ${exit_code}"
    else
        log_info "All tests completed successfully"
    fi

    # Cleanup
    cleanup_test_env

    exit $exit_code
}

# Execute main function with all arguments
main "$@"