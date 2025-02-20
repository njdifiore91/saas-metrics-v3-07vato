# Production environment variables for Startup Metrics Platform
# terraform ~> 1.5

# Core environment configuration
variable "aws_region" {
  type        = string
  description = "AWS region for production deployment"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment identifier, strictly enforced as prod"
  default     = "prod"
  validation {
    condition     = var.environment == "prod"
    error_message = "Environment must be prod for production configuration"
  }
}

# Networking configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for production VPC with proper network segmentation"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment ensuring high availability"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ECS configuration
variable "ecs_cluster_name" {
  type        = string
  description = "Name of the ECS cluster for production workloads"
  default     = "startup-metrics-prod"
}

variable "ecs_services" {
  type = map(object({
    cpu           = number
    memory        = number
    desired_count = number
    auto_scaling = object({
      min_capacity           = number
      max_capacity          = number
      target_cpu_utilization = number
    })
  }))
  description = "Production service configurations for ECS tasks"
  default = {
    api = {
      cpu           = 1024
      memory        = 2048
      desired_count = 3
      auto_scaling = {
        min_capacity           = 3
        max_capacity          = 10
        target_cpu_utilization = 70
      }
    }
    metrics = {
      cpu           = 2048
      memory        = 4096
      desired_count = 3
      auto_scaling = {
        min_capacity           = 3
        max_capacity          = 8
        target_cpu_utilization = 75
      }
    }
    benchmark = {
      cpu           = 2048
      memory        = 4096
      desired_count = 3
      auto_scaling = {
        min_capacity           = 3
        max_capacity          = 8
        target_cpu_utilization = 75
      }
    }
  }
}

# RDS configuration
variable "rds_instance_class" {
  type        = string
  description = "Production-grade RDS instance class with high performance capabilities"
  default     = "db.r6g.xlarge"
  validation {
    condition     = can(regex("^db\\.r6g\\.", var.rds_instance_class))
    error_message = "RDS instance class must be from r6g family for production workloads"
  }
}

variable "rds_backup_retention" {
  type        = number
  description = "Extended RDS backup retention period for production data safety"
  default     = 30
  validation {
    condition     = var.rds_backup_retention >= 30 && var.rds_backup_retention <= 35
    error_message = "Production backup retention must be between 30 and 35 days"
  }
}

variable "rds_multi_az" {
  type        = bool
  description = "Enable multi-AZ deployment for RDS production environment"
  default     = true
}

# Redis configuration
variable "redis_node_type" {
  type        = string
  description = "High-performance Redis node type for production caching requirements"
  default     = "cache.r6g.large"
  validation {
    condition     = can(regex("^cache\\.r6g\\.", var.redis_node_type))
    error_message = "Redis node type must be from r6g family for production workloads"
  }
}

variable "redis_num_clusters" {
  type        = number
  description = "Number of Redis clusters for high availability and failover"
  default     = 2
  validation {
    condition     = var.redis_num_clusters >= 2
    error_message = "Production Redis must have at least 2 clusters for high availability"
  }
}

# Domain configuration
variable "domain_name" {
  type        = string
  description = "Production domain name for the platform"
  default     = "metrics.startup.com"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-\\.]+[a-z0-9]$", var.domain_name))
    error_message = "Domain name must be a valid DNS hostname"
  }
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Common tags for all production resources including compliance and management tags"
  default = {
    Environment = "prod"
    Project     = "startup-metrics"
    ManagedBy   = "terraform"
    Compliance  = "soc2"
    Backup      = "required"
    CostCenter  = "platform"
  }
}

# Security configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption for all supporting services"
  default     = true
}

variable "ssl_certificate_arn" {
  type        = string
  description = "ARN of SSL certificate for production domain"
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of allowed CIDR blocks for production VPC"
  default     = []
  validation {
    condition     = alltrue([for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))])
    error_message = "All CIDR blocks must be valid"
  }
}