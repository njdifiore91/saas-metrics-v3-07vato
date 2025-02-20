# AWS RDS Aurora PostgreSQL cluster configuration
# Provider version: hashicorp/aws ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  cluster_identifier    = "${var.environment}-startup-metrics-db"
  backup_window        = "03:00-04:00"
  maintenance_window   = "mon:04:00-mon:05:00"
  monitoring_interval  = 60
  port                = 5432
}

# DB subnet group for RDS cluster
resource "aws_db_subnet_group" "this" {
  name        = "${local.cluster_identifier}-subnet-group"
  subnet_ids  = var.database_subnet_ids
  description = "Subnet group for ${local.cluster_identifier} RDS cluster"

  tags = {
    Name         = "${local.cluster_identifier}-subnet-group"
    Environment  = var.environment
    SecurityZone = "database"
  }
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.cluster_identifier}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${local.cluster_identifier}-monitoring-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Security group for RDS cluster
resource "aws_security_group" "rds" {
  name        = "${local.cluster_identifier}-sg"
  vpc_id      = var.vpc_id
  description = "Security group for RDS cluster ${local.cluster_identifier}"

  ingress {
    description = "PostgreSQL access from allowed CIDRs"
    from_port   = local.port
    to_port     = local.port
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name         = "${local.cluster_identifier}-sg"
    Environment  = var.environment
    SecurityZone = "database"
  }
}

# RDS Aurora PostgreSQL cluster
resource "aws_rds_cluster" "this" {
  cluster_identifier     = local.cluster_identifier
  engine                = "aurora-postgresql"
  engine_version        = "14.9"
  database_name         = var.database_name
  master_username       = var.database_username
  master_password       = var.database_password

  db_subnet_group_name  = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.backup_retention_period
  preferred_backup_window = local.backup_window
  preferred_maintenance_window = local.maintenance_window
  
  storage_encrypted     = var.enable_encryption
  kms_key_id           = var.enable_encryption ? var.kms_key_id : null
  
  copy_tags_to_snapshot = true
  deletion_protection   = true
  apply_immediately     = false
  skip_final_snapshot   = false
  final_snapshot_identifier = "${local.cluster_identifier}-final"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  iam_database_authentication_enabled = true

  tags = {
    Name         = local.cluster_identifier
    Environment  = var.environment
    Backup       = "required"
    SecurityZone = "database"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# RDS cluster instances
resource "aws_rds_cluster_instance" "this" {
  count                           = var.instance_count
  identifier                      = "${local.cluster_identifier}-${count.index}"
  cluster_identifier             = aws_rds_cluster.this.id
  instance_class                 = var.instance_class
  engine                         = "aurora-postgresql"
  auto_minor_version_upgrade    = true
  
  performance_insights_enabled    = var.enable_performance_insights
  performance_insights_retention_period = 7
  monitoring_interval            = local.monitoring_interval
  monitoring_role_arn           = aws_iam_role.rds_monitoring.arn
  
  promotion_tier                = count.index

  tags = {
    Name        = "${local.cluster_identifier}-${count.index}"
    Environment = var.environment
    Role        = count.index == 0 ? "primary" : "replica"
  }
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${local.cluster_identifier}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.this.cluster_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "free_storage" {
  alarm_name          = "${local.cluster_identifier}-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name        = "FreeStorageSpace"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "10000000000"  # 10GB in bytes
  alarm_description  = "This metric monitors RDS free storage space"
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.this.cluster_identifier
  }
}