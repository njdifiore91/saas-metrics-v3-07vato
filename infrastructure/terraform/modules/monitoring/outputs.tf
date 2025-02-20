# Prometheus service endpoint output
output "prometheus_endpoint" {
  description = "Secure HTTPS endpoint URL for accessing Prometheus metrics and queries"
  value       = "https://${kubernetes_service.prometheus.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9090"
  sensitive   = true
}

# Grafana dashboard endpoint output
output "grafana_endpoint" {
  description = "Secure HTTPS endpoint URL for accessing Grafana dashboards and visualizations"
  value       = "https://${kubernetes_service.grafana.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:3000"
  sensitive   = true
}

# Elasticsearch service endpoint output
output "elasticsearch_endpoint" {
  description = "Secure HTTPS endpoint URL for accessing Elasticsearch logs and queries"
  value       = "https://${kubernetes_service.elasticsearch.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9200"
  sensitive   = true
}

# CloudWatch log group name output
output "log_group_name" {
  description = "CloudWatch log group name for centralized logging and log aggregation"
  value       = aws_cloudwatch_log_group.monitoring.name
}

# Monitoring namespace output
output "monitoring_namespace" {
  description = "Kubernetes namespace containing all monitoring infrastructure components"
  value       = kubernetes_namespace.monitoring.metadata[0].name
}

# Prometheus retention period output
output "prometheus_retention_period" {
  description = "Configured retention period for Prometheus metrics in days"
  value       = var.monitoring_config.prometheus.retention_days
}

# Grafana version output
output "grafana_version" {
  description = "Deployed version of Grafana"
  value       = var.monitoring_config.grafana.version
}

# CloudWatch alarms output
output "cloudwatch_alarms" {
  description = "Map of CloudWatch alarms configured for monitoring"
  value = {
    api_response_time    = aws_cloudwatch_metric_alarm.api_response_time.id
    system_availability = aws_cloudwatch_metric_alarm.system_availability.id
  }
}

# Monitoring configuration output
output "monitoring_config" {
  description = "Active monitoring configuration settings"
  value = {
    prometheus = {
      retention_days  = var.monitoring_config.prometheus.retention_days
      storage_size   = var.monitoring_config.prometheus.storage_size
      scrape_interval = var.monitoring_config.prometheus.scrape_interval
    }
    elasticsearch = {
      instance_count = var.monitoring_config.elasticsearch.instance_count
      instance_type = var.monitoring_config.elasticsearch.instance_type
    }
    cloudwatch = {
      log_retention_days = var.monitoring_config.cloudwatch.log_retention_days
    }
  }
  sensitive = false
}