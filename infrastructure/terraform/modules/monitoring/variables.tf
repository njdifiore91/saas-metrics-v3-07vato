# Core Terraform functionality for variable definitions
# hashicorp/terraform >= 1.5.0

# Environment name variable with validation
variable "environment" {
  description = "Environment name (dev/staging/prod)"
  type        = string
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

# VPC ID for monitoring resource deployment
variable "vpc_id" {
  description = "ID of the VPC where monitoring resources will be deployed"
  type        = string
}

# Subnet IDs for monitoring components
variable "subnet_ids" {
  description = "List of subnet IDs where monitoring components will be deployed"
  type        = list(string)
}

# Detailed monitoring flag
variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring and metrics collection"
  type        = bool
  default     = true
}

# Monitoring configuration object
variable "monitoring_config" {
  description = "Configuration object for monitoring components"
  type = object({
    prometheus = object({
      retention_days  = number
      storage_size   = string
      scrape_interval = string
    })
    grafana = object({
      admin_password = string
      version       = string
    })
    elasticsearch = object({
      instance_count = number
      instance_type = string
      volume_size   = number
    })
    cloudwatch = object({
      log_retention_days    = number
      metric_retention_days = number
    })
  })

  default = {
    prometheus = {
      retention_days  = 15
      storage_size   = "50Gi"
      scrape_interval = "15s"
    }
    grafana = {
      version       = "9.5.3"
      admin_password = null
    }
    elasticsearch = {
      instance_count = 3
      instance_type = "t3.medium"
      volume_size   = 100
    }
    cloudwatch = {
      log_retention_days    = 30
      metric_retention_days = 90
    }
  }

  validation {
    condition     = var.monitoring_config.prometheus.retention_days >= 7
    error_message = "Prometheus retention days must be at least 7 days."
  }

  validation {
    condition     = var.monitoring_config.elasticsearch.instance_count >= 1
    error_message = "Elasticsearch instance count must be at least 1."
  }

  validation {
    condition     = var.monitoring_config.elasticsearch.volume_size >= 50
    error_message = "Elasticsearch volume size must be at least 50GB."
  }
}

# Alert thresholds configuration
variable "alert_thresholds" {
  description = "Monitoring alert thresholds configuration"
  type = object({
    cpu_utilization    = number
    memory_utilization = number
    disk_usage        = number
    response_time     = number
    error_rate        = number
  })

  default = {
    cpu_utilization    = 80
    memory_utilization = 85
    disk_usage        = 85
    response_time     = 2000  # milliseconds
    error_rate        = 5     # percentage
  }

  validation {
    condition     = var.alert_thresholds.cpu_utilization > 0 && var.alert_thresholds.cpu_utilization <= 100
    error_message = "CPU utilization threshold must be between 0 and 100."
  }

  validation {
    condition     = var.alert_thresholds.memory_utilization > 0 && var.alert_thresholds.memory_utilization <= 100
    error_message = "Memory utilization threshold must be between 0 and 100."
  }

  validation {
    condition     = var.alert_thresholds.disk_usage > 0 && var.alert_thresholds.disk_usage <= 100
    error_message = "Disk usage threshold must be between 0 and 100."
  }

  validation {
    condition     = var.alert_thresholds.error_rate >= 0 && var.alert_thresholds.error_rate <= 100
    error_message = "Error rate threshold must be between 0 and 100."
  }
}

# Tags for monitoring resources
variable "tags" {
  description = "Tags to be applied to all monitoring resources"
  type        = map(string)
  default     = {}
}