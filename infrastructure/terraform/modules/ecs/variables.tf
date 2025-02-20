# Core environment variable with validation
variable "environment" {
  type        = string
  description = "Environment name (e.g., prod, staging, dev)"
  
  validation {
    condition     = can(regex("^(prod|staging|dev)$", var.environment))
    error_message = "Environment must be one of: prod, staging, dev"
  }
}

# VPC configuration
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where ECS resources will be deployed"
}

# Subnet configuration with validation
variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs where ECS tasks will be deployed"
  
  validation {
    condition     = length(var.private_subnet_ids) > 0
    error_message = "At least one private subnet ID must be provided"
  }
}

# ECS cluster name
variable "cluster_name" {
  type        = string
  description = "Name of the ECS cluster"
}

# Service configurations with validation
variable "services" {
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
  description = "Map of service configurations with CPU, memory, and auto-scaling settings"
  
  validation {
    condition     = alltrue([for k, v in var.services : contains([256, 512, 1024, 2048, 4096], v.cpu)])
    error_message = "CPU values must be one of: 256, 512, 1024, 2048, 4096"
  }
}

# Container insights configuration
variable "container_insights" {
  type        = bool
  description = "Enable CloudWatch Container Insights for the ECS cluster"
  default     = true
}

# Capacity providers configuration
variable "capacity_providers" {
  type        = list(string)
  description = "List of capacity providers for the ECS cluster"
  default     = ["FARGATE", "FARGATE_SPOT"]
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all ECS resources"
  default     = {}
}