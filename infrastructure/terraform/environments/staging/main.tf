# Terraform configuration for Startup Metrics Platform staging environment
# Provider version: hashicorp/aws ~> 5.0
# Terraform version: ~> 1.5

terraform {
  required_version = "~> 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Backend configuration should be provided via backend.hcl
    key = "environments/staging/terraform.tfstate"
  }
}

# AWS Provider configuration
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = local.common_tags
  }
}

# Local variables
locals {
  environment = "staging"
  common_tags = {
    Environment = local.environment
    Project     = "startup-metrics-platform"
    ManagedBy   = "terraform"
  }
}

# Networking Module - Single AZ deployment for staging
module "networking" {
  source = "../../modules/networking"

  vpc_cidr            = "10.1.0.0/16"
  environment         = local.environment
  az_count           = 2  # Reduced AZ count for staging
  single_nat_gateway = true  # Cost optimization for staging
  enable_flow_logs   = true  # Enhanced debugging capability

  tags = local.common_tags
}

# ECS Module - Staging configuration with debugging enabled
module "ecs" {
  source = "../../modules/ecs"

  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.subnet_ids["private"]
  cluster_name       = "startup-metrics-staging"
  
  container_insights    = true  # Enhanced monitoring for staging
  enable_execute_command = true  # Debugging capability
  
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]  # Cost optimization with spot instances
  
  services = {
    api = {
      cpu           = 512
      memory        = 1024
      desired_count = 1  # Reduced count for staging
      auto_scaling = {
        min_capacity           = 1
        max_capacity          = 3
        target_cpu_utilization = 70
      }
    }
    worker = {
      cpu           = 256
      memory        = 512
      desired_count = 1
      auto_scaling = {
        min_capacity           = 1
        max_capacity          = 2
        target_cpu_utilization = 70
      }
    }
  }

  tags = local.common_tags
}

# RDS Module - Staging database configuration
module "rds" {
  source = "../../modules/rds"

  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  database_subnet_ids = module.networking.subnet_ids["database"]
  
  instance_class    = "db.r6g.large"  # Reduced instance size for staging
  instance_count    = 2  # Minimum HA setup
  
  database_name     = "startup_metrics_staging"
  database_username = var.database_username
  database_password = var.database_password
  
  backup_retention_period = 7  # Reduced retention for staging
  enable_performance_insights = true  # Enhanced monitoring
  
  allowed_cidr_blocks = [module.networking.vpc_cidr]

  tags = local.common_tags
}

# Redis Module - Staging cache configuration
module "redis" {
  source = "../../modules/redis"

  environment        = local.environment
  vpc_id            = module.networking.vpc_id
  private_subnet_ids = module.networking.subnet_ids["private"]
  
  node_type          = "cache.r6g.large"  # Reduced instance size for staging
  num_cache_clusters = 2  # Minimum HA setup
  
  backup_retention_period = 7  # Reduced retention for staging
  maintenance_window     = "sun:05:00-sun:09:00"
  snapshot_window       = "00:00-05:00"
  
  multi_az_enabled = true  # Maintain HA capability
  automatic_failover_enabled = true
  
  tags = local.common_tags
}

# Outputs for reference by other components
output "vpc_outputs" {
  description = "VPC and subnet information"
  value = {
    vpc_id             = module.networking.vpc_id
    private_subnet_ids = module.networking.subnet_ids["private"]
    database_subnet_ids = module.networking.subnet_ids["database"]
  }
}

output "database_outputs" {
  description = "Database connection information"
  value = {
    rds_endpoint   = module.rds.endpoint
    redis_endpoint = module.redis.redis_endpoint
  }
  sensitive = true
}

output "ecs_outputs" {
  description = "ECS cluster information"
  value = {
    cluster_name   = module.ecs.cluster_name
    service_names  = module.ecs.service_names
  }
}