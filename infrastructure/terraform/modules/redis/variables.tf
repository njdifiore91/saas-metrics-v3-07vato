# Terraform AWS ElastiCache Redis Module Variables
# terraform ~> 1.5

variable "environment" {
  type        = string
  description = "Environment identifier for resource naming and tagging (e.g., dev, staging, prod)"
  validation {
    condition     = length(var.environment) > 0
    error_message = "Environment variable must not be empty"
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where Redis cluster will be deployed"
  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must start with 'vpc-'"
  }
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for Redis subnet group (minimum 2 for HA)"
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability"
  }
}

variable "node_type" {
  type        = string
  description = "ElastiCache node type for Redis cluster (r6g family recommended for performance)"
  default     = "cache.r6g.large"
  validation {
    condition     = can(regex("^cache.r6g.", var.node_type))
    error_message = "Node type must be from r6g family for optimal performance"
  }
}

variable "num_cache_clusters" {
  type        = number
  description = "Number of cache clusters in the replication group (minimum 2 for HA)"
  default     = 2
  validation {
    condition     = var.num_cache_clusters >= 2
    error_message = "Minimum of 2 cache clusters required for high availability"
  }
}

variable "engine_version" {
  type        = string
  description = "Redis engine version (6.x recommended for feature compatibility)"
  default     = "6.x"
}

variable "port" {
  type        = number
  description = "Port number for Redis cluster"
  default     = 6379
}

variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family matching engine version"
  default     = "redis6.x"
}

variable "automatic_failover_enabled" {
  type        = bool
  description = "Enable automatic failover for multi-AZ deployments"
  default     = true
}

variable "multi_az_enabled" {
  type        = bool
  description = "Enable multi-AZ deployment for high availability"
  default     = true
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automatic backups"
  default     = 7
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range for maintenance operations (UTC)"
  default     = "sun:05:00-sun:09:00"
}

variable "snapshot_window" {
  type        = string
  description = "Daily time range for taking automated snapshots"
  default     = "00:00-05:00"
}

variable "transit_encryption_enabled" {
  type        = bool
  description = "Enable encryption in transit (TLS)"
  default     = true
}

variable "at_rest_encryption_enabled" {
  type        = bool
  description = "Enable encryption at rest using AWS KMS"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources"
  default     = {}
}