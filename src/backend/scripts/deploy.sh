#!/usr/bin/env bash

# Startup Metrics Platform - ECS Deployment Script
# Version: 1.0.0
# Maintainer: DevOps Team

set -euo pipefail
IFS=$'\n\t'

# Security settings
umask 027
export AWS_SDK_LOAD_CONFIG=1
export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"

# Service configuration
readonly SERVICES=("api-gateway" "auth" "metrics" "benchmark")
readonly ENVIRONMENTS=("prod" "staging" "dev")
readonly CLUSTER_NAME="${ECS_CLUSTER_NAME:-startup-metrics}"
readonly ECR_REGISTRY="${ECR_REGISTRY:-}"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Deployment configuration
readonly DEPLOYMENT_TIMEOUT=1800
readonly HEALTH_CHECK_INTERVAL=30
readonly HEALTH_CHECK_RETRIES=10
readonly CANARY_PERCENTAGE=10
readonly ROLLBACK_THRESHOLD=25
readonly LOG_DIR="/var/log/startup-metrics/deployments"
readonly LOG_FILE="${LOG_DIR}/deploy_${TIMESTAMP}.log"
readonly ERROR_LOG="${LOG_DIR}/deploy_errors_${TIMESTAMP}.log"
readonly AUDIT_LOG="${LOG_DIR}/deploy_audit_${TIMESTAMP}.log"

# Resource configurations per environment
declare -A RESOURCE_LIMITS=(
    ["prod"]="cpu=1024,memory=2048"
    ["staging"]="cpu=512,memory=1024"
    ["dev"]="cpu=256,memory=512"
)

# Deployment strategies per environment
declare -A DEPLOYMENT_STRATEGIES=(
    ["prod"]="BLUE_GREEN_CANARY"
    ["staging"]="BLUE_GREEN"
    ["dev"]="ROLLING"
)

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

# Verify AWS credentials and permissions
check_aws_credentials() {
    echo "[INFO] Verifying AWS credentials and permissions..."

    local required_permissions=(
        "ecs:UpdateService"
        "ecs:DescribeServices"
        "ecs:RegisterTaskDefinition"
        "ecr:GetAuthorizationToken"
        "ecr:BatchCheckLayerAvailability"
        "ecr:GetDownloadUrlForLayer"
        "ecr:BatchGetImage"
    )

    if ! aws sts get-caller-identity &> /dev/null; then
        echo "[ERROR] AWS credentials not configured" | tee -a "${ERROR_LOG}"
        return 1
    }

    for permission in "${required_permissions[@]}"; do
        if ! aws iam simulate-principal-policy \
            --policy-source-arn "$(aws sts get-caller-identity --query 'Arn' --output text)" \
            --action-names "${permission}" \
            --query 'EvaluationResults[].EvalDecision' \
            --output text | grep -q "allowed"; then
            echo "[ERROR] Missing required permission: ${permission}" | tee -a "${ERROR_LOG}"
            return 1
        fi
    done

    return 0
}

# Update ECS task definition
update_task_definition() {
    local service_name=$1
    local environment=$2
    local image_tag=$3

    echo "[INFO] Updating task definition for ${service_name}..."

    # Get resource limits for environment
    IFS=',' read -r cpu memory <<< "${RESOURCE_LIMITS[${environment}]}"

    # Create new task definition
    local task_def_file="/tmp/${service_name}_taskdef_${TIMESTAMP}.json"
    aws ecs describe-task-definition \
        --task-definition "${service_name}" \
        --query 'taskDefinition' \
        > "${task_def_file}"

    # Update container image and resource limits
    jq --arg image "${ECR_REGISTRY}/${service_name}:${image_tag}" \
       --arg cpu "${cpu}" \
       --arg memory "${memory}" \
       '.containerDefinitions[0].image = $image | .cpu = $cpu | .memory = $memory' \
       "${task_def_file}" > "${task_def_file}.tmp" && mv "${task_def_file}.tmp" "${task_def_file}"

    # Register new task definition
    local task_def_arn
    task_def_arn=$(aws ecs register-task-definition \
        --cli-input-json "file://${task_def_file}" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)

    rm -f "${task_def_file}"
    echo "${task_def_arn}"
}

# Deploy service using specified strategy
deploy_service() {
    local service_name=$1
    local environment=$2
    local deployment_strategy=${3:-${DEPLOYMENT_STRATEGIES[${environment}]}}

    echo "[INFO] Deploying ${service_name} to ${environment} using ${deployment_strategy} strategy..."

    # Record deployment start in audit log
    echo "[AUDIT] Deployment started for ${service_name} in ${environment} at $(date -u)" >> "${AUDIT_LOG}"

    local image_tag="${TIMESTAMP}"
    local task_def_arn
    task_def_arn=$(update_task_definition "${service_name}" "${environment}" "${image_tag}")

    case "${deployment_strategy}" in
        "BLUE_GREEN_CANARY")
            deploy_blue_green_canary "${service_name}" "${environment}" "${task_def_arn}"
            ;;
        "BLUE_GREEN")
            deploy_blue_green "${service_name}" "${environment}" "${task_def_arn}"
            ;;
        "ROLLING")
            deploy_rolling "${service_name}" "${environment}" "${task_def_arn}"
            ;;
        *)
            echo "[ERROR] Invalid deployment strategy: ${deployment_strategy}" | tee -a "${ERROR_LOG}"
            return 1
            ;;
    esac

    local deploy_status=$?
    
    if [[ ${deploy_status} -eq 0 ]]; then
        echo "[INFO] Deployment completed successfully for ${service_name} in ${environment}"
        echo "[AUDIT] Deployment completed successfully for ${service_name} in ${environment} at $(date -u)" >> "${AUDIT_LOG}"
    else
        echo "[ERROR] Deployment failed for ${service_name} in ${environment}"
        echo "[AUDIT] Deployment failed for ${service_name} in ${environment} at $(date -u)" >> "${AUDIT_LOG}"
    fi

    return ${deploy_status}
}

# Blue-Green deployment with canary
deploy_blue_green_canary() {
    local service_name=$1
    local environment=$2
    local task_def_arn=$3

    # Create test listener and target group
    local test_tg_arn
    test_tg_arn=$(create_target_group "${service_name}" "${environment}" "test")

    # Deploy canary
    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${service_name}" \
        --task-definition "${task_def_arn}" \
        --desired-count $((CANARY_PERCENTAGE * $(get_service_count "${service_name}") / 100))

    # Monitor canary health
    if ! monitor_deployment "${service_name}" "${environment}" "${DEPLOYMENT_TIMEOUT}"; then
        rollback_deployment "${service_name}" "${environment}"
        return 1
    fi

    # Complete blue-green deployment
    deploy_blue_green "${service_name}" "${environment}" "${task_def_arn}"
}

# Blue-Green deployment
deploy_blue_green() {
    local service_name=$1
    local environment=$2
    local task_def_arn=$3

    # Create new target group
    local new_tg_arn
    new_tg_arn=$(create_target_group "${service_name}" "${environment}" "new")

    # Update service with new task definition
    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${service_name}" \
        --task-definition "${task_def_arn}" \
        --load-balancer target-group="${new_tg_arn}"

    # Monitor deployment
    if ! monitor_deployment "${service_name}" "${environment}" "${DEPLOYMENT_TIMEOUT}"; then
        rollback_deployment "${service_name}" "${environment}"
        return 1
    fi

    # Switch traffic to new target group
    update_listener "${service_name}" "${environment}" "${new_tg_arn}"
}

# Rolling deployment
deploy_rolling() {
    local service_name=$1
    local environment=$2
    local task_def_arn=$3

    # Update service with new task definition
    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${service_name}" \
        --task-definition "${task_def_arn}" \
        --force-new-deployment

    # Monitor deployment
    if ! monitor_deployment "${service_name}" "${environment}" "${DEPLOYMENT_TIMEOUT}"; then
        rollback_deployment "${service_name}" "${environment}"
        return 1
    fi
}

# Monitor deployment health
monitor_deployment() {
    local service_name=$1
    local environment=$2
    local timeout=$3
    local start_time
    start_time=$(date +%s)

    echo "[INFO] Monitoring deployment health for ${service_name}..."

    while true; do
        local deployment_status
        deployment_status=$(aws ecs describe-services \
            --cluster "${CLUSTER_NAME}" \
            --services "${service_name}" \
            --query 'services[0].deployments[0].status' \
            --output text)

        if [[ "${deployment_status}" == "PRIMARY" ]]; then
            return 0
        fi

        if [[ "${deployment_status}" == "FAILED" ]]; then
            echo "[ERROR] Deployment failed for ${service_name}" | tee -a "${ERROR_LOG}"
            return 1
        fi

        if [[ $(($(date +%s) - start_time)) -gt ${timeout} ]]; then
            echo "[ERROR] Deployment timeout for ${service_name}" | tee -a "${ERROR_LOG}"
            return 1
        fi

        sleep "${HEALTH_CHECK_INTERVAL}"
    done
}

# Rollback deployment
rollback_deployment() {
    local service_name=$1
    local environment=$2

    echo "[INFO] Rolling back deployment for ${service_name}..."

    # Get previous task definition
    local previous_task_def
    previous_task_def=$(aws ecs describe-services \
        --cluster "${CLUSTER_NAME}" \
        --services "${service_name}" \
        --query 'services[0].taskDefinition' \
        --output text)

    # Rollback to previous task definition
    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${service_name}" \
        --task-definition "${previous_task_def}" \
        --force-new-deployment

    echo "[AUDIT] Rollback initiated for ${service_name} in ${environment} at $(date -u)" >> "${AUDIT_LOG}"
}

# Main deployment process
main() {
    echo "[INFO] Starting deployment process at $(date -u)"

    setup_logging
    check_aws_credentials || exit 1

    local environment=$1
    if [[ ! " ${ENVIRONMENTS[*]} " =~ ${environment} ]]; then
        echo "[ERROR] Invalid environment: ${environment}" | tee -a "${ERROR_LOG}"
        exit 1
    fi

    local failed_services=()

    for service in "${SERVICES[@]}"; do
        if ! deploy_service "${service}" "${environment}"; then
            failed_services+=("${service}")
        fi
    done

    if [[ ${#failed_services[@]} -gt 0 ]]; then
        echo "[ERROR] Failed services: ${failed_services[*]}" | tee -a "${ERROR_LOG}"
        exit 1
    fi

    echo "[INFO] Deployment completed successfully at $(date -u)"
    exit 0
}

# Cleanup handler
cleanup() {
    local exit_code=$?
    echo "[INFO] Cleaning up deployment resources..."

    # Restore file descriptors
    exec 1>&3 2>&4

    # Record deployment completion in audit log
    echo "[AUDIT] Deployment script completed with exit code ${exit_code} at $(date -u)" >> "${AUDIT_LOG}"

    exit "${exit_code}"
}

trap cleanup EXIT

# Execute main process with timeout
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <environment>"
    exit 1
fi

timeout "${DEPLOYMENT_TIMEOUT}" main "$1"