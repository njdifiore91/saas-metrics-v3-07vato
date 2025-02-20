# Core VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC network space"
  type        = string
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block in format x.x.x.x/x"
  }
}

variable "environment" {
  description = "Deployment environment name for resource tagging and configuration (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "az_count" {
  description = "Number of availability zones to use for high availability (minimum 2, maximum 3)"
  type        = number
  default     = 3
  validation {
    condition     = var.az_count > 1 && var.az_count <= 3
    error_message = "AZ count must be between 2 and 3 for high availability requirements"
  }
}

# NAT Gateway Configuration
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets (cost savings for non-prod)"
  type        = bool
  default     = false
}

# Subnet Tagging Configuration
variable "public_subnet_tags" {
  description = "Additional tags for public subnet resources"
  type        = map(string)
  default     = {}
}

variable "private_subnet_tags" {
  description = "Additional tags for private subnet resources"
  type        = map(string)
  default     = {}
}

variable "database_subnet_tags" {
  description = "Additional tags for database subnet resources"
  type        = map(string)
  default     = {}
}