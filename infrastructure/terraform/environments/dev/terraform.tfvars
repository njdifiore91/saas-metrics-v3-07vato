# Project and environment configuration
project_name = "startup-metrics"
aws_region   = "us-east-1"
environment  = "dev"

# Network configuration
vpc_cidr            = "10.0.0.0/16"
availability_zones  = ["us-east-1a"]

# ECS configuration
ecs_configuration = {
  cluster_name        = "startup-metrics-dev"
  instance_type      = "t3.medium"
  container_insights = false
  capacity_providers = ["FARGATE"]
  services = {
    api_gateway = {
      cpu           = 256
      memory        = 512
      desired_count = 1
      auto_scaling = {
        min_capacity           = 1
        max_capacity          = 2
        target_cpu_utilization = 70
      }
    }
    auth_service = {
      cpu           = 256
      memory        = 512
      desired_count = 1
      auto_scaling = {
        min_capacity           = 1
        max_capacity          = 2
        target_cpu_utilization = 70
      }
    }
    benchmark_service = {
      cpu           = 512
      memory        = 1024
      desired_count = 1
      auto_scaling = {
        min_capacity           = 1
        max_capacity          = 2
        target_cpu_utilization = 70
      }
    }
  }
}

# RDS configuration
rds_configuration = {
  instance_class          = "db.t3.medium"
  instance_count         = 1
  backup_retention_period = 7
  database_name          = "startup_metrics_dev"
}

# Redis configuration
redis_configuration = {
  node_type           = "cache.t3.medium"
  num_cache_clusters  = 1
}

# Monitoring and general settings
enable_monitoring = false

# Resource tagging
tags = {
  Environment = "dev"
  Project     = "startup-metrics"
  ManagedBy   = "terraform"
}