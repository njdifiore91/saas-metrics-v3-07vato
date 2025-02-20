#!/bin/bash

# Protocol Buffer Code Generation Script
# Version: 1.0.0
# Dependencies:
# - protoc v3.21.0
# - ts-protoc-gen v0.15.0
# - grpcio-tools v1.54.0

set -euo pipefail

# Directory constants
PROTO_DIR="src/backend/proto"
TS_OUT_DIR="src/backend/services"
PY_OUT_DIR="src/backend/services/benchmark/src/proto"
LOG_FILE="proto-gen.log"

# Initialize logging
exec 1> >(tee -a "$LOG_FILE") 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting protocol buffer code generation..."

# Check required dependencies
check_dependencies() {
    echo "Checking dependencies..."
    
    # Check protoc installation
    if ! command -v protoc &> /dev/null; then
        echo "Error: protoc is not installed. Please install protobuf v3.21.0" >&2
        return 1
    fi
    
    PROTOC_VERSION=$(protoc --version | cut -d' ' -f2)
    if [[ "$PROTOC_VERSION" != "3.21.0" ]]; then
        echo "Warning: Expected protoc version 3.21.0, found $PROTOC_VERSION"
    fi
    
    # Check TypeScript plugin
    if ! command -v protoc-gen-ts &> /dev/null; then
        echo "Error: protoc-gen-ts is not installed. Please install ts-protoc-gen v0.15.0" >&2
        return 1
    fi
    
    # Check Python gRPC tools
    if ! python3 -c "import grpc_tools.protoc" &> /dev/null; then
        echo "Error: grpcio-tools is not installed. Please install v1.54.0" >&2
        return 1
    fi
    
    # Verify proto files exist
    for proto in "auth.proto" "benchmark.proto" "metrics.proto"; do
        if [[ ! -f "${PROTO_DIR}/${proto}" ]]; then
            echo "Error: ${proto} not found in ${PROTO_DIR}" >&2
            return 1
        fi
    done
    
    return 0
}

# Clean output directories
clean_output_dirs() {
    echo "Cleaning output directories..."
    
    # Backup existing generated code
    local timestamp=$(date +%Y%m%d_%H%M%S)
    if [[ -d "$TS_OUT_DIR" ]]; then
        mv "$TS_OUT_DIR" "${TS_OUT_DIR}_backup_${timestamp}" 2>/dev/null || true
    fi
    if [[ -d "$PY_OUT_DIR" ]]; then
        mv "$PY_OUT_DIR" "${PY_OUT_DIR}_backup_${timestamp}" 2>/dev/null || true
    fi
    
    # Create fresh directories
    mkdir -p "${TS_OUT_DIR}/auth/src/proto"
    mkdir -p "${TS_OUT_DIR}/metrics/src/proto"
    mkdir -p "$PY_OUT_DIR"
    
    # Set permissions
    chmod 755 "$TS_OUT_DIR" "$PY_OUT_DIR"
}

# Generate TypeScript code
generate_typescript_code() {
    local proto_file=$1
    local output_dir=$2
    local service_name=$3
    
    echo "Generating TypeScript code for ${service_name}..."
    
    protoc \
        --plugin="protoc-gen-ts=./node_modules/.bin/protoc-gen-ts" \
        --ts_out="service=grpc-node:${output_dir}" \
        --js_out="import_style=commonjs,binary:${output_dir}" \
        --proto_path="${PROTO_DIR}" \
        "${PROTO_DIR}/${proto_file}" \
        "${PROTO_DIR}/metrics.proto" \
        "google/protobuf/timestamp.proto" \
        "google/protobuf/empty.proto" \
        "google/protobuf/wrappers.proto"
    
    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to generate TypeScript code for ${service_name}" >&2
        return 1
    fi
    
    # Add version comment to generated files
    find "${output_dir}" -type f -name "*.ts" -exec \
        sed -i.bak '1i// Generated using protoc v3.21.0 with ts-protoc-gen v0.15.0\n' {} \;
    find "${output_dir}" -type f -name "*.js" -exec \
        sed -i.bak '1i// Generated using protoc v3.21.0 with ts-protoc-gen v0.15.0\n' {} \;
    
    # Clean up backup files
    find "${output_dir}" -name "*.bak" -delete
    
    return 0
}

# Generate Python code
generate_python_code() {
    local proto_file=$1
    local output_dir=$2
    
    echo "Generating Python code for benchmark service..."
    
    python3 -m grpc_tools.protoc \
        --python_out="${output_dir}" \
        --grpc_python_out="${output_dir}" \
        --proto_path="${PROTO_DIR}" \
        "${PROTO_DIR}/${proto_file}" \
        "${PROTO_DIR}/metrics.proto" \
        "google/protobuf/timestamp.proto" \
        "google/protobuf/empty.proto" \
        "google/protobuf/wrappers.proto"
    
    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to generate Python code for benchmark service" >&2
        return 1
    fi
    
    # Add version comment to generated files
    find "${output_dir}" -type f -name "*.py" -exec \
        sed -i.bak '1i# Generated using grpcio-tools v1.54.0\n' {} \;
    
    # Clean up backup files
    find "${output_dir}" -name "*.bak" -delete
    
    # Create __init__.py
    touch "${output_dir}/__init__.py"
    
    return 0
}

# Main execution
main() {
    local exit_code=0
    
    # Check dependencies
    if ! check_dependencies; then
        echo "Failed dependency check. Aborting." >&2
        return 1
    fi
    
    # Clean and prepare directories
    clean_output_dirs
    
    # Generate TypeScript code for auth service
    if ! generate_typescript_code "auth.proto" "${TS_OUT_DIR}/auth/src/proto" "auth"; then
        exit_code=1
    fi
    
    # Generate TypeScript code for metrics service
    if ! generate_typescript_code "metrics.proto" "${TS_OUT_DIR}/metrics/src/proto" "metrics"; then
        exit_code=1
    fi
    
    # Generate Python code for benchmark service
    if ! generate_python_code "benchmark.proto" "$PY_OUT_DIR"; then
        exit_code=1
    fi
    
    # Verify generated files
    echo "Verifying generated files..."
    for service in "auth" "metrics"; do
        if [[ ! -f "${TS_OUT_DIR}/${service}/src/proto/${service}_pb.d.ts" ]]; then
            echo "Error: Missing TypeScript definitions for ${service}" >&2
            exit_code=1
        fi
    done
    
    if [[ ! -f "${PY_OUT_DIR}/benchmark_pb2.py" ]]; then
        echo "Error: Missing Python generated code for benchmark service" >&2
        exit_code=1
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        echo "Protocol buffer code generation completed successfully"
    else
        echo "Protocol buffer code generation completed with errors" >&2
    fi
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Finished protocol buffer code generation"
    return $exit_code
}

# Execute main function
main "$@"