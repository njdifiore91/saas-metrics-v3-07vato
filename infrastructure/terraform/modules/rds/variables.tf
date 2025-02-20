# Terraform variables definition file for RDS Aurora PostgreSQL cluster module
# Version: hashicorp/terraform ~> 1.5

variable "environment" {
  type        = string
  description = "Environment identifier (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where RDS cluster will be deployed"
}

variable "database_subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for RDS cluster deployment"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.r6g.xlarge"
  validation {
    condition     = can(regex("^db\\.r6g\\.", var.instance_class))
    error_message = "Instance class must be from the r6g family (e.g., db.r6g.xlarge)."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of RDS instances"
  default     = 2
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 3
    error_message = "Instance count must be between 1 and 3."
  }
}

variable "database_name" {
  type        = string
  description = "Name of the PostgreSQL database"
  validation {
    condition     = can(regex("^[a-zA-Z0-9_]+$", var.database_name)) && length(var.database_name) >= 1 && length(var.database_name) <= 63
    error_message = "Database name must be alphanumeric (including underscores) and between 1-63 characters."
  }
}

variable "database_username" {
  type        = string
  description = "Master username for PostgreSQL database"
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]+$", var.database_username)) && length(var.database_username) >= 1 && length(var.database_username) <= 63
    error_message = "Username must start with a letter, contain only alphanumeric characters or underscores, and be between 1-63 characters."
  }
}

variable "database_password" {
  type        = string
  description = "Master password for PostgreSQL database"
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z0-9!@#$%^&*()_+=-]+$", var.database_password)) && length(var.database_password) >= 8 && length(var.database_password) <= 128
    error_message = "Password must contain at least 8 characters, include uppercase, lowercase, numbers, and special characters (!@#$%^&*()_+=-), and not exceed 128 characters."
  }
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 30
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days."
  }
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of CIDR blocks allowed to access RDS"
  validation {
    condition     = alltrue([for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))])
    error_message = "All elements must be valid CIDR blocks."
  }
}

variable "enable_encryption" {
  type        = bool
  description = "Enable storage encryption"
  default     = true
}

variable "kms_key_id" {
  type        = string
  description = "KMS key ID for storage encryption"
  default     = "aws/rds"
}

variable "enable_performance_insights" {
  type        = bool
  description = "Enable RDS Performance Insights"
  default     = true
}