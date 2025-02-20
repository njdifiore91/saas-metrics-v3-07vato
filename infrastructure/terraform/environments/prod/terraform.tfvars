# Core environment configuration
aws_region  = "us-east-1"
environment = "prod"

# VPC and networking
vpc_cidr = "10.0.0.0/16"
availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c"
]

# ECS cluster configuration
ecs_cluster_name = "startup-metrics-prod"
container_insights = true
capacity_providers = ["FARGATE", "FARGATE_SPOT"]

# Service configurations
services = {
  api_gateway = {
    cpu           = 1024
    memory        = 2048
    desired_count = 3
    auto_scaling = {
      min_capacity           = 3
      max_capacity          = 10
      target_cpu_utilization = 70
    }
  }
  auth_service = {
    cpu           = 512
    memory        = 1024
    desired_count = 3
    auto_scaling = {
      min_capacity           = 3
      max_capacity          = 8
      target_cpu_utilization = 70
    }
  }
  benchmark_service = {
    cpu           = 2048
    memory        = 4096
    desired_count = 3
    auto_scaling = {
      min_capacity           = 3
      max_capacity          = 12
      target_cpu_utilization = 70
    }
  }
  metrics_service = {
    cpu           = 1024
    memory        = 2048
    desired_count = 3
    auto_scaling = {
      min_capacity           = 3
      max_capacity          = 10
      target_cpu_utilization = 70
    }
  }
}

# RDS configuration
rds_instance_class    = "db.r6g.xlarge"
rds_instance_count    = 2
rds_backup_retention  = 30
database_name         = "startup_metrics_prod"
enable_encryption     = true
enable_performance_insights = true

# Redis configuration
redis_node_type     = "cache.r6g.large"
redis_num_clusters  = 2
redis_engine_version = "6.x"
redis_port          = 6379
automatic_failover_enabled = true
multi_az_enabled    = true
transit_encryption_enabled = true
at_rest_encryption_enabled = true
redis_maintenance_window = "sun:05:00-sun:09:00"
redis_snapshot_window   = "00:00-05:00"

# Domain configuration
domain_name = "metrics.startup.com"

# Common resource tags
tags = {
  Environment = "prod"
  Project     = "startup-metrics"
  ManagedBy   = "terraform"
  Compliance  = "soc2"
  Backup      = "required"
  CostCenter  = "platform"
}

# Security configuration
allowed_cidr_blocks = [
  "10.0.0.0/16",  # VPC CIDR
  "172.16.0.0/12" # Corporate network
]

# Monitoring configuration
container_insights = true