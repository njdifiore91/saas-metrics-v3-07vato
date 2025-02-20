# Terraform variable definitions for development environment
# terraform ~> 1.5

# Project identification
variable "project_name" {
  type        = string
  description = "Name of the startup metrics platform project"
  default     = "startup-metrics"
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

# AWS region configuration
variable "aws_region" {
  type        = string
  description = "AWS region where development resources will be deployed"
  default     = "us-east-1"
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in valid format (e.g., us-east-1)"
  }
}

# Environment enforcement
variable "environment" {
  type        = string
  description = "Environment identifier, strictly enforced as 'dev' for development"
  default     = "dev"
  validation {
    condition     = var.environment == "dev"
    error_message = "Environment must be 'dev' for development environment"
  }
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for development VPC network"
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be in valid CIDR notation"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones, limited to single AZ for development"
  default     = ["us-east-1a"]
  validation {
    condition     = length(var.availability_zones) == 1
    error_message = "Development environment must use single AZ deployment"
  }
}

# ECS configuration
variable "ecs_instance_type" {
  type        = string
  description = "ECS instance type for development containers"
  default     = "t3.medium"
  validation {
    condition     = can(regex("^t3\\.(micro|small|medium)$", var.ecs_instance_type))
    error_message = "Development ECS instances must use t3.micro, t3.small, or t3.medium"
  }
}

# RDS configuration
variable "rds_instance_class" {
  type        = string
  description = "RDS instance class for development database"
  default     = "db.t3.medium"
  validation {
    condition     = can(regex("^db\\.t3\\.(micro|small|medium)$", var.rds_instance_class))
    error_message = "Development RDS instances must use db.t3.micro, db.t3.small, or db.t3.medium"
  }
}

# Redis configuration
variable "redis_node_type" {
  type        = string
  description = "Redis node type for development cache"
  default     = "cache.t3.medium"
  validation {
    condition     = can(regex("^cache\\.t3\\.(micro|small|medium)$", var.redis_node_type))
    error_message = "Development Redis nodes must use cache.t3.micro, cache.t3.small, or cache.t3.medium"
  }
}

# Backup configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups in development"
  default     = 7
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 7
    error_message = "Development backup retention must be between 1 and 7 days"
  }
}

# Monitoring configuration
variable "enable_monitoring" {
  type        = bool
  description = "Toggle for detailed monitoring in development environment"
  default     = false
}

# Database configuration
variable "database_name" {
  type        = string
  description = "Name of the development database"
  default     = "startup_metrics_dev"
  validation {
    condition     = can(regex("^[a-zA-Z0-9_]+$", var.database_name))
    error_message = "Database name must contain only alphanumeric characters and underscores"
  }
}

# Redis cluster configuration
variable "redis_num_cache_clusters" {
  type        = number
  description = "Number of cache clusters for development Redis (minimum 1 for dev)"
  default     = 1
  validation {
    condition     = var.redis_num_cache_clusters == 1
    error_message = "Development environment must use single Redis cluster"
  }
}

# Common resource tags
variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all development resources"
  default = {
    Environment = "dev"
    Project     = "startup-metrics"
    ManagedBy   = "terraform"
    Debug       = "enabled"
  }
}

# Security configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption for development resources"
  default     = true
}

# VPC subnet configuration
variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets in development"
  default     = ["10.0.1.0/24"]
  validation {
    condition     = length(var.private_subnet_cidrs) == 1
    error_message = "Development environment must use single private subnet"
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets in development"
  default     = ["10.0.2.0/24"]
  validation {
    condition     = length(var.public_subnet_cidrs) == 1
    error_message = "Development environment must use single public subnet"
  }
}