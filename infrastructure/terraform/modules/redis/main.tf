# AWS ElastiCache Redis Module
# terraform ~> 5.0
# Provider: hashicorp/aws ~> 5.0

# Redis Replication Group with Multi-AZ support and automatic failover
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${var.environment}-redis"
  description                   = "Redis cluster for ${var.environment} environment"
  node_type                     = var.node_type
  num_cache_clusters           = var.num_cache_clusters
  engine                       = "redis"
  engine_version               = var.engine_version
  port                         = var.port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  automatic_failover_enabled  = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  maintenance_window         = var.maintenance_window
  snapshot_retention_limit   = var.backup_retention_period
  snapshot_window           = var.snapshot_window

  tags = merge(
    {
      Name        = "${var.environment}-redis"
      Environment = var.environment
      Terraform   = "true"
      Module      = "redis"
    },
    var.tags
  )

  lifecycle {
    prevent_destroy = true
  }
}

# Redis Parameter Group for custom configuration
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.parameter_group_family
  name        = "${var.environment}-redis-params"
  description = "Custom parameter group for ${var.environment} Redis cluster"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "appendonly"
    value = "yes"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  tags = merge(
    {
      Environment = var.environment
      Terraform   = "true"
      Module      = "redis"
    },
    var.tags
  )
}

# Redis Subnet Group for VPC placement
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.environment}-redis-subnet"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for ${var.environment} Redis cluster"

  tags = merge(
    {
      Environment = var.environment
      Terraform   = "true"
      Module      = "redis"
    },
    var.tags
  )
}

# Security Group for Redis access
resource "aws_security_group" "redis" {
  name        = "${var.environment}-redis-sg"
  description = "Security group for ${var.environment} Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis access from internal network"
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    {
      Name        = "${var.environment}-redis-sg"
      Environment = var.environment
      Terraform   = "true"
      Module      = "redis"
    },
    var.tags
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Output values for other modules to consume
output "redis_endpoint" {
  description = "Redis primary endpoint address"
  value = {
    address = aws_elasticache_replication_group.redis.primary_endpoint_address
    port    = aws_elasticache_replication_group.redis.port
  }
}

output "security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

output "redis_arn" {
  description = "ARN of the Redis replication group"
  value       = aws_elasticache_replication_group.redis.arn
}