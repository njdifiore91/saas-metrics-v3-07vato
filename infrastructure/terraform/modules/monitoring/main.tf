# AWS Provider configuration for monitoring resources
# Version: hashicorp/aws ~> 5.0
provider "aws" {
  # Provider configuration inherited from root module
}

# Kubernetes Provider configuration for monitoring deployments
# Version: hashicorp/kubernetes ~> 2.23
provider "kubernetes" {
  # Provider configuration inherited from root module
}

# Local variables for monitoring configuration
locals {
  monitoring_namespace = "monitoring-${var.environment}"
  common_tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "terraform"
    Component   = "monitoring"
  })

  # Prometheus configuration
  prometheus_version = "v2.45.0"
  prometheus_retention = "${var.monitoring_config.prometheus.retention_days}d"
  
  # Grafana configuration
  grafana_version = var.monitoring_config.grafana.version
  
  # ELK Stack configuration
  elasticsearch_version = "8.9.0"
  kibana_version = "8.9.0"
  
  # Jaeger configuration
  jaeger_version = "1.47"
}

# Monitoring namespace
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = local.monitoring_namespace
    labels = local.common_tags
  }
}

# Service accounts for monitoring components
resource "kubernetes_service_account" "prometheus" {
  metadata {
    name      = "prometheus-sa"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }
}

resource "kubernetes_service_account" "grafana" {
  metadata {
    name      = "grafana-sa"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }
}

# Prometheus deployment
resource "kubernetes_deployment" "prometheus" {
  metadata {
    name      = "prometheus"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "prometheus"
      }
    }

    template {
      metadata {
        labels = {
          app = "prometheus"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.prometheus.metadata[0].name
        
        container {
          name  = "prometheus"
          image = "prom/prometheus:${local.prometheus_version}"
          
          args = [
            "--storage.tsdb.retention.time=${local.prometheus_retention}",
            "--config.file=/etc/prometheus/prometheus.yml",
            "--storage.tsdb.path=/prometheus",
            "--web.enable-lifecycle"
          ]

          port {
            container_port = 9090
          }

          volume_mount {
            name       = "prometheus-storage"
            mount_path = "/prometheus"
          }

          resources {
            limits = {
              cpu    = "1000m"
              memory = "2Gi"
            }
            requests = {
              cpu    = "500m"
              memory = "1Gi"
            }
          }

          liveness_probe {
            http_get {
              path = "/-/healthy"
              port = 9090
            }
            initial_delay_seconds = 30
            period_seconds       = 10
          }
        }

        volume {
          name = "prometheus-storage"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.prometheus_storage.metadata[0].name
          }
        }
      }
    }
  }
}

# Prometheus persistent storage
resource "kubernetes_persistent_volume_claim" "prometheus_storage" {
  metadata {
    name      = "prometheus-storage"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.monitoring_config.prometheus.storage_size
      }
    }
  }
}

# Prometheus service
resource "kubernetes_service" "prometheus" {
  metadata {
    name      = "prometheus"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }

  spec {
    selector = {
      app = "prometheus"
    }

    port {
      port        = 9090
      target_port = 9090
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Grafana deployment
resource "kubernetes_deployment" "grafana" {
  metadata {
    name      = "grafana"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "grafana"
      }
    }

    template {
      metadata {
        labels = {
          app = "grafana"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.grafana.metadata[0].name

        container {
          name  = "grafana"
          image = "grafana/grafana:${local.grafana_version}"

          port {
            container_port = 3000
          }

          env {
            name  = "GF_SECURITY_ADMIN_PASSWORD"
            value = var.monitoring_config.grafana.admin_password
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "1Gi"
            }
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
          }

          volume_mount {
            name       = "grafana-storage"
            mount_path = "/var/lib/grafana"
          }

          liveness_probe {
            http_get {
              path = "/api/health"
              port = 3000
            }
            initial_delay_seconds = 60
            period_seconds       = 10
          }
        }

        volume {
          name = "grafana-storage"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.grafana_storage.metadata[0].name
          }
        }
      }
    }
  }
}

# Grafana persistent storage
resource "kubernetes_persistent_volume_claim" "grafana_storage" {
  metadata {
    name      = "grafana-storage"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
  }
}

# Grafana service
resource "kubernetes_service" "grafana" {
  metadata {
    name      = "grafana"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    labels    = local.common_tags
  }

  spec {
    selector = {
      app = "grafana"
    }

    port {
      port        = 3000
      target_port = 3000
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "monitoring" {
  name              = "/aws/monitoring/${var.environment}"
  retention_in_days = var.monitoring_config.cloudwatch.log_retention_days
  tags             = local.common_tags
}

# CloudWatch Alarms for SLA monitoring
resource "aws_cloudwatch_metric_alarm" "api_response_time" {
  alarm_name          = "${var.environment}-api-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Duration"
  namespace          = "AWS/ApiGateway"
  period             = "300"
  statistic          = "Average"
  threshold          = var.alert_thresholds.response_time
  alarm_description  = "API response time exceeds ${var.alert_thresholds.response_time}ms"
  alarm_actions      = []  # Add SNS topic ARNs for notifications
  tags               = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "system_availability" {
  alarm_name          = "${var.environment}-system-availability"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "HealthyHostCount"
  namespace          = "AWS/ApplicationELB"
  period             = "300"
  statistic          = "Average"
  threshold          = 1
  alarm_description  = "System availability below target"
  alarm_actions      = []  # Add SNS topic ARNs for notifications
  tags               = local.common_tags
}

# Outputs
output "prometheus_endpoint" {
  description = "Prometheus service endpoint"
  value       = "http://${kubernetes_service.prometheus.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9090"
}

output "grafana_endpoint" {
  description = "Grafana dashboard endpoint"
  value       = "http://${kubernetes_service.grafana.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:3000"
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.monitoring.name
}