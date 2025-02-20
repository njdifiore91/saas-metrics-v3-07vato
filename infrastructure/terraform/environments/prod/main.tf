# Terraform configuration for production environment
# Provider: hashicorp/aws ~> 5.0
# Terraform: ~> 1.5

terraform {
  required_version = "~> 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "startup-metrics-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# AWS Provider configuration
provider "aws" {
  region = local.region

  default_tags {
    tags = local.common_tags
  }
}

# Local variables
locals {
  environment = "prod"
  region     = "us-east-1"
  
  common_tags = {
    Environment = local.environment
    Project     = "startup-metrics"
    ManagedBy   = "terraform"
  }

  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Networking Module - Multi-AZ VPC setup
module "networking" {
  source = "../modules/networking"

  vpc_cidr            = "10.0.0.0/16"
  environment         = local.environment
  region              = local.region
  availability_zones  = local.availability_zones
  enable_nat_gateway  = true
  single_nat_gateway  = false
  enable_vpn_gateway  = false
  enable_flow_logs    = true
  
  tags = local.common_tags
}

# ECS Module - Container orchestration
module "ecs" {
  source = "../modules/ecs"

  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.subnet_ids.private
  cluster_name       = "startup-metrics-prod"
  container_insights = true
  
  services = {
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

  tags = local.common_tags
}

# RDS Module - Aurora PostgreSQL cluster
module "rds" {
  source = "../modules/rds"

  environment            = local.environment
  vpc_id                = module.networking.vpc_id
  database_subnet_ids   = module.networking.subnet_ids.database
  instance_class        = "db.r6g.xlarge"
  instance_count        = 2
  database_name         = "startup_metrics"
  database_username     = "admin"
  database_password     = "PLACEHOLDER_TO_BE_INJECTED_BY_SECRETS_MANAGER"
  backup_retention_period = 30
  allowed_cidr_blocks   = [module.networking.vpc_cidr]
  enable_encryption     = true
  enable_performance_insights = true

  tags = local.common_tags
}

# Redis Module - ElastiCache cluster
module "redis" {
  source = "../modules/redis"

  environment               = local.environment
  vpc_id                   = module.networking.vpc_id
  private_subnet_ids       = module.networking.subnet_ids.private
  node_type                = "cache.r6g.large"
  num_cache_clusters       = 2
  engine_version           = "7.0"
  automatic_failover_enabled = true
  multi_az_enabled         = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  backup_retention_period  = 7
  maintenance_window       = "sun:05:00-sun:09:00"
  snapshot_window         = "00:00-05:00"

  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "ID of the production VPC"
  value       = module.networking.vpc_id
}

output "database_endpoint" {
  description = "RDS cluster endpoint"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.redis_endpoint
  sensitive   = true
}

output "ecs_cluster_id" {
  description = "ECS cluster ID"
  value       = module.ecs.cluster_id
}

output "ecs_service_names" {
  description = "Names of ECS services"
  value       = module.ecs.service_names
}