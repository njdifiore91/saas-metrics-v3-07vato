# Development Environment Terraform Configuration
# AWS Provider version: ~> 5.0
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
    key = "environments/dev/terraform.tfstate"
  }
}

# Provider configuration
provider "aws" {
  region = local.region

  default_tags {
    tags = local.common_tags
  }
}

# Local variables
locals {
  environment = "dev"
  region     = "us-east-1"
  
  common_tags = {
    Environment = local.environment
    Project     = "startup-metrics"
    ManagedBy   = "terraform"
    CostCenter  = "development"
  }

  # Development-specific configurations
  vpc_config = {
    cidr_block           = "10.0.0.0/16"
    availability_zones   = ["us-east-1a"]  # Single AZ for dev
    enable_flow_logs    = true
    flow_log_retention  = 7
  }

  ecs_config = {
    cluster_name          = "startup-metrics-dev"
    container_insights    = false  # Disabled for cost savings
    enable_execute_command = true  # Enabled for debugging
    task_cpu             = "256"
    task_memory          = "512"
    auto_scaling_enabled = false
  }

  rds_config = {
    instance_class               = "db.t4g.medium"  # Cost-optimized instance
    instance_count              = 1                # Single instance for dev
    backup_retention_period     = 7
    skip_final_snapshot        = true
    database_name              = "startup_metrics_dev"
    enable_performance_insights = true
  }

  redis_config = {
    node_type                  = "cache.t4g.medium"  # Cost-optimized instance
    num_cache_clusters        = 1                   # Single node for dev
    engine_version           = "7.0"
    parameter_group_family   = "redis7"
    automatic_failover_enabled = false
    snapshot_retention_limit  = 3
  }
}

# Networking module for VPC and subnet configuration
module "networking" {
  source = "../../modules/networking"

  environment         = local.environment
  vpc_cidr           = local.vpc_config.cidr_block
  availability_zones = local.vpc_config.availability_zones
  enable_flow_logs   = local.vpc_config.enable_flow_logs
  flow_log_retention = local.vpc_config.flow_log_retention
  tags              = local.common_tags
}

# ECS module for container orchestration
module "ecs" {
  source = "../../modules/ecs"

  environment            = local.environment
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.subnet_ids.private
  cluster_name          = local.ecs_config.cluster_name
  container_insights    = local.ecs_config.container_insights
  enable_execute_command = local.ecs_config.enable_execute_command
  task_cpu             = local.ecs_config.task_cpu
  task_memory          = local.ecs_config.task_memory
  auto_scaling_enabled = local.ecs_config.auto_scaling_enabled
  tags                 = local.common_tags
}

# RDS module for PostgreSQL database
module "rds" {
  source = "../../modules/rds"

  environment                 = local.environment
  vpc_id                     = module.networking.vpc_id
  database_subnet_ids        = module.networking.subnet_ids.database
  instance_class             = local.rds_config.instance_class
  instance_count             = local.rds_config.instance_count
  backup_retention_period    = local.rds_config.backup_retention_period
  skip_final_snapshot       = local.rds_config.skip_final_snapshot
  database_name             = local.rds_config.database_name
  enable_performance_insights = local.rds_config.enable_performance_insights
  allowed_cidr_blocks       = [local.vpc_config.cidr_block]
  tags                      = local.common_tags
}

# Redis module for caching
module "redis" {
  source = "../../modules/redis"

  environment               = local.environment
  vpc_id                   = module.networking.vpc_id
  private_subnet_ids       = module.networking.subnet_ids.private
  node_type                = local.redis_config.node_type
  num_cache_clusters       = local.redis_config.num_cache_clusters
  engine_version          = local.redis_config.engine_version
  parameter_group_family  = local.redis_config.parameter_group_family
  automatic_failover_enabled = local.redis_config.automatic_failover_enabled
  snapshot_retention_limit = local.redis_config.snapshot_retention_limit
  tags                    = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.networking.vpc_id
}

output "database_endpoint" {
  description = "PostgreSQL database endpoint"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.redis_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}