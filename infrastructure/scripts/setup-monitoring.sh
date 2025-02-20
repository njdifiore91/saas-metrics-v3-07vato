#!/bin/bash

# Setup Monitoring Script v1.0.0
# Configures comprehensive monitoring stack with Prometheus, Grafana, and ELK Stack
# Supports system uptime and response time monitoring requirements

# Global variables
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="9.5.3"
ELASTICSEARCH_VERSION="7.17.0"
MONITORING_BASE_DIR="/opt/monitoring"
LOG_FILE="/var/log/monitoring-setup.log"

# Logging function
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Check prerequisites for monitoring stack setup
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check Docker version
    if ! docker --version | grep -q "20.10.0"; then
        log "ERROR" "Docker version 20.10.0 or higher required"
        return 1
    fi

    # Check docker-compose version
    if ! docker-compose --version | grep -q "2.20.0"; then
        log "ERROR" "docker-compose version 2.20.0 or higher required"
        return 1
    }

    # Check available memory
    local available_memory=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$available_memory" -lt 4 ]; then
        log "ERROR" "Minimum 4GB RAM required"
        return 1
    }

    # Check disk space
    local available_space=$(df -BG "$MONITORING_BASE_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 50 ]; then
        log "ERROR" "Minimum 50GB disk space required"
        return 1
    }

    # Check required ports
    local ports=(9090 3000 9200 5601)
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            log "ERROR" "Port $port is already in use"
            return 1
        fi
    done

    log "INFO" "Prerequisites check passed"
    return 0
}

# Setup Prometheus monitoring
setup_prometheus() {
    log "INFO" "Setting up Prometheus..."

    # Create Prometheus directories
    mkdir -p "$MONITORING_BASE_DIR/prometheus/"{data,config,rules}
    chown -R 65534:65534 "$MONITORING_BASE_DIR/prometheus"

    # Configure uptime monitoring rules
    cat > "$MONITORING_BASE_DIR/prometheus/rules/uptime.yml" <<EOF
groups:
  - name: uptime
    rules:
      - alert: ServiceDowntime
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ \$labels.job }} is down"
          description: "Service availability below 99.9% threshold"
EOF

    # Configure response time rules
    cat > "$MONITORING_BASE_DIR/prometheus/rules/response_time.yml" <<EOF
groups:
  - name: response_time
    rules:
      - alert: HighResponseTime
        expr: http_request_duration_seconds > 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ \$labels.job }}"
          description: "Response time exceeds 2 second SLO"
EOF

    # Start Prometheus container
    docker run -d \
        --name prometheus \
        --restart unless-stopped \
        -p 9090:9090 \
        -v "$MONITORING_BASE_DIR/prometheus/config:/etc/prometheus" \
        -v "$MONITORING_BASE_DIR/prometheus/data:/prometheus" \
        prom/prometheus:$PROMETHEUS_VERSION \
        --config.file=/etc/prometheus/prometheus.yml \
        --storage.tsdb.path=/prometheus \
        --storage.tsdb.retention.time=30d \
        --web.enable-lifecycle

    log "INFO" "Prometheus setup completed"
    return 0
}

# Setup Grafana dashboards
setup_grafana() {
    log "INFO" "Setting up Grafana..."

    # Create Grafana directories
    mkdir -p "$MONITORING_BASE_DIR/grafana/"{data,provisioning,dashboards}
    chown -R 472:472 "$MONITORING_BASE_DIR/grafana"

    # Configure Grafana container
    docker run -d \
        --name grafana \
        --restart unless-stopped \
        -p 3000:3000 \
        -v "$MONITORING_BASE_DIR/grafana/data:/var/lib/grafana" \
        -v "$MONITORING_BASE_DIR/grafana/provisioning:/etc/grafana/provisioning" \
        -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
        -e "GF_USERS_ALLOW_SIGN_UP=false" \
        -e "GF_AUTH_ANONYMOUS_ENABLED=true" \
        -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer" \
        grafana/grafana:$GRAFANA_VERSION

    # Import default dashboards
    local dashboard_uid=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"dashboard": {"title": "System Overview", "uid": "system-overview"}}' \
        http://admin:admin@localhost:3000/api/dashboards/db | jq -r '.uid')

    log "INFO" "Grafana setup completed with dashboard UID: $dashboard_uid"
    return 0
}

# Setup ELK Stack
setup_elk() {
    log "INFO" "Setting up ELK Stack..."

    # Create ELK directories
    mkdir -p "$MONITORING_BASE_DIR/elasticsearch/"{data,logs}
    mkdir -p "$MONITORING_BASE_DIR/logstash/"{config,pipeline}
    mkdir -p "$MONITORING_BASE_DIR/kibana/config"

    # Set correct permissions
    chown -R 1000:1000 "$MONITORING_BASE_DIR/elasticsearch"
    chown -R 1000:1000 "$MONITORING_BASE_DIR/logstash"
    chown -R 1000:1000 "$MONITORING_BASE_DIR/kibana"

    # Configure system limits
    echo "vm.max_map_count=262144" > /etc/sysctl.d/99-elasticsearch.conf
    sysctl -p /etc/sysctl.d/99-elasticsearch.conf

    # Start ELK stack
    docker-compose -f "$MONITORING_BASE_DIR/docker-compose.elk.yml" up -d

    log "INFO" "ELK Stack setup completed"
    return 0
}

# Verify monitoring stack
verify_monitoring() {
    log "INFO" "Verifying monitoring stack..."
    local status=0

    # Check Prometheus
    if ! curl -s "http://localhost:9090/-/healthy" | grep -q "Prometheus is Healthy"; then
        log "ERROR" "Prometheus health check failed"
        status=1
    fi

    # Check Grafana
    if ! curl -s "http://localhost:3000/api/health" | grep -q "ok"; then
        log "ERROR" "Grafana health check failed"
        status=1
    fi

    # Check Elasticsearch
    if ! curl -s "http://localhost:9200/_cluster/health" | grep -q '"status":"green"'; then
        log "ERROR" "Elasticsearch health check failed"
        status=1
    fi

    # Verify metrics collection
    if ! curl -s "http://localhost:9090/api/v1/targets" | grep -q '"health":"up"'; then
        log "ERROR" "Metrics collection verification failed"
        status=1
    fi

    if [ $status -eq 0 ]; then
        log "INFO" "Monitoring stack verification completed successfully"
    else
        log "ERROR" "Monitoring stack verification failed"
    fi

    return $status
}

# Main execution
main() {
    log "INFO" "Starting monitoring setup..."

    # Create base directory
    mkdir -p "$MONITORING_BASE_DIR"

    # Run setup steps
    check_prerequisites || exit 1
    setup_prometheus || exit 1
    setup_grafana || exit 1
    setup_elk || exit 1
    verify_monitoring || exit 1

    log "INFO" "Monitoring setup completed successfully"
}

# Execute main function
main "$@"