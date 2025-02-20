# Output definitions for RDS Aurora PostgreSQL cluster module
# Provider version: hashicorp/terraform ~> 1.5

output "cluster_endpoint" {
  description = "Primary endpoint for the RDS Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.this.endpoint
  sensitive   = false
}

output "reader_endpoint" {
  description = "Reader endpoint for load-balanced read replicas"
  value       = aws_rds_cluster.this.reader_endpoint
  sensitive   = false
}

output "cluster_identifier" {
  description = "Identifier of the RDS Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.this.cluster_identifier
  sensitive   = false
}

output "security_group_id" {
  description = "ID of the security group controlling access to RDS cluster"
  value       = aws_security_group.rds.id
  sensitive   = false
}

output "cluster_arn" {
  description = "ARN of the RDS Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.this.arn
  sensitive   = false
}

output "cluster_port" {
  description = "Port number on which the RDS cluster accepts connections"
  value       = aws_rds_cluster.this.port
  sensitive   = false
}

output "database_name" {
  description = "Name of the default database"
  value       = aws_rds_cluster.this.database_name
  sensitive   = false
}

output "cluster_resource_id" {
  description = "Unique resource ID assigned by AWS for the RDS cluster"
  value       = aws_rds_cluster.this.cluster_resource_id
  sensitive   = false
}

output "monitoring_role_arn" {
  description = "ARN of the IAM role used for enhanced monitoring"
  value       = aws_iam_role.rds_monitoring.arn
  sensitive   = false
}

output "subnet_group_name" {
  description = "Name of the DB subnet group used by the RDS cluster"
  value       = aws_db_subnet_group.this.name
  sensitive   = false
}

output "backup_retention_period" {
  description = "Number of days for which automated backups are retained"
  value       = aws_rds_cluster.this.backup_retention_period
  sensitive   = false
}

output "preferred_backup_window" {
  description = "Daily time range during which automated backups are created"
  value       = aws_rds_cluster.this.preferred_backup_window
  sensitive   = false
}

output "maintenance_window" {
  description = "Weekly time range during which system maintenance can occur"
  value       = aws_rds_cluster.this.preferred_maintenance_window
  sensitive   = false
}

output "enabled_cloudwatch_logs_exports" {
  description = "List of log types configured for CloudWatch export"
  value       = aws_rds_cluster.this.enabled_cloudwatch_logs_exports
  sensitive   = false
}

output "storage_encrypted" {
  description = "Specifies whether the DB cluster storage is encrypted"
  value       = aws_rds_cluster.this.storage_encrypted
  sensitive   = false
}