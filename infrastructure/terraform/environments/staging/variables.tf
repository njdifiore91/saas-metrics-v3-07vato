# Terraform variable definitions for staging environment
# terraform ~> 1.5

# Core environment configuration
variable "environment" {
  type        = string
  description = "Environment identifier"
  default     = "staging"
  validation {
    condition     = var.environment == "staging"
    error_message = "This configuration is specifically for staging environment"
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"
  validation {
    condition     = can(regex("^us-(east|west)-[1-2]$", var.aws_region))
    error_message = "AWS region must be one of: us-east-1, us-east-2, us-west-1, us-west-2"
  }
}

# VPC Configuration
variable "vpc_config" {
  type = object({
    cidr_block            = string
    private_subnet_cidrs  = list(string)
    public_subnet_cidrs   = list(string)
  })
  description = "VPC configuration for staging environment"
  default = {
    cidr_block            = "10.1.0.0/16"  # Staging VPC CIDR
    private_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
    public_subnet_cidrs   = ["10.1.3.0/24", "10.1.4.0/24"]
  }
  validation {
    condition     = can(cidrhost(var.vpc_config.cidr_block, 0))
    error_message = "VPC CIDR block must be a valid CIDR notation"
  }
}

# ECS Fargate Configuration
variable "ecs_config" {
  type = object({
    cluster_name        = string
    container_insights  = bool
    services = map(object({
      cpu           = number
      memory        = number
      desired_count = number
      auto_scaling = object({
        min_capacity           = number
        max_capacity          = number
        target_cpu_utilization = number
      })
    }))
  })
  description = "ECS Fargate configuration for staging environment"
  default = {
    cluster_name       = "startup-metrics-staging"
    container_insights = true
    services = {
      api = {
        cpu           = 512
        memory        = 1024
        desired_count = 2
        auto_scaling = {
          min_capacity           = 1
          max_capacity          = 4
          target_cpu_utilization = 70
        }
      }
      auth = {
        cpu           = 256
        memory        = 512
        desired_count = 1
        auto_scaling = {
          min_capacity           = 1
          max_capacity          = 2
          target_cpu_utilization = 70
        }
      }
      benchmark = {
        cpu           = 1024
        memory        = 2048
        desired_count = 1
        auto_scaling = {
          min_capacity           = 1
          max_capacity          = 2
          target_cpu_utilization = 70
        }
      }
    }
  }
}

# RDS Aurora PostgreSQL Configuration
variable "rds_config" {
  type = object({
    instance_class          = string
    instance_count         = number
    database_name          = string
    backup_retention_period = number
  })
  description = "RDS Aurora PostgreSQL configuration for staging environment"
  default = {
    instance_class          = "db.r6g.xlarge"
    instance_count         = 2
    database_name          = "startup_metrics_staging"
    backup_retention_period = 7
  }
  validation {
    condition     = can(regex("^db\\.r6g\\.", var.rds_config.instance_class))
    error_message = "RDS instance class must be from the r6g family"
  }
}

# ElastiCache Redis Configuration
variable "redis_config" {
  type = object({
    node_type          = string
    num_cache_clusters = number
    engine_version     = string
  })
  description = "ElastiCache Redis configuration for staging environment"
  default = {
    node_type          = "cache.r6g.large"
    num_cache_clusters = 2
    engine_version     = "6.x"
  }
  validation {
    condition     = can(regex("^cache\\.r6g\\.", var.redis_config.node_type))
    error_message = "Redis node type must be from the r6g family"
  }
}

# Common resource tags
variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    Environment = "staging"
    Project     = "startup-metrics"
    ManagedBy   = "terraform"
  }
  validation {
    condition     = contains(keys(var.tags), "Environment") && var.tags["Environment"] == "staging"
    error_message = "Tags must include Environment = staging"
  }
}