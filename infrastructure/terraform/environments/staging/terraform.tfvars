# Core environment configuration
environment = "staging"
aws_region  = "us-east-1"

# VPC Configuration
vpc_config = {
  cidr_block            = "10.1.0.0/16"
  private_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  public_subnet_cidrs   = ["10.1.10.0/24", "10.1.11.0/24"]
  enable_nat_gateway    = true
  enable_vpn_gateway    = false
  enable_flow_logs      = true
}

# ECS Fargate Configuration
ecs_config = {
  cluster_name        = "startup-metrics-staging"
  container_insights  = true
  capacity_providers  = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy = {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 1
  }
  services = {
    api_gateway = {
      cpu           = 1024
      memory        = 2048
      desired_count = 2
      auto_scaling = {
        min_capacity           = 2
        max_capacity          = 4
        target_cpu_utilization = 70
        target_memory_utilization = 80
        scale_in_cooldown     = 300
        scale_out_cooldown    = 300
      }
      health_check = {
        path                = "/health"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 2
        unhealthy_threshold = 3
      }
    }
    auth_service = {
      cpu           = 512
      memory        = 1024
      desired_count = 2
      auto_scaling = {
        min_capacity           = 2
        max_capacity          = 4
        target_cpu_utilization = 70
        target_memory_utilization = 80
        scale_in_cooldown     = 300
        scale_out_cooldown    = 300
      }
      health_check = {
        path                = "/auth/health"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 2
        unhealthy_threshold = 3
      }
    }
  }
}

# RDS Configuration
rds_config = {
  instance_class          = "db.r6g.xlarge"
  instance_count         = 2
  database_name          = "startup_metrics_staging"
  engine                 = "postgres"
  engine_version         = "14.7"
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  multi_az              = true
  storage = {
    allocated_size     = 100
    max_allocated_size = 500
    iops              = 3000
    type              = "gp3"
  }
  monitoring = {
    interval  = 60
    role_arn  = "arn:aws:iam::123456789012:role/rds-monitoring-role"
  }
}

# Redis Configuration
redis_config = {
  node_type                = "cache.r6g.large"
  num_cache_clusters       = 2
  engine_version          = "6.x"
  parameter_group_family  = "redis6.x"
  port                    = 6379
  maintenance_window      = "sun:05:00-sun:06:00"
  snapshot_retention_limit = 7
  snapshot_window         = "04:00-05:00"
  auto_minor_version_upgrade = true
  at_rest_encryption     = true
  transit_encryption     = true
}

# Common resource tags
tags = {
  Environment        = "staging"
  Project           = "startup-metrics"
  ManagedBy         = "terraform"
  BusinessUnit      = "engineering"
  CostCenter        = "stg-001"
  DataClassification = "confidential"
  Backup            = "daily"
}