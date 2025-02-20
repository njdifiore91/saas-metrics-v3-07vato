# Core cluster outputs
output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# Service-related outputs
output "service_arns" {
  description = "Map of service names to their ARNs"
  value = {
    for name, service in aws_ecs_service.services : name => service.id
  }
}

output "service_names" {
  description = "List of all ECS service names deployed in the cluster"
  value       = keys(var.services)
}

# Security group outputs
output "task_security_group_id" {
  description = "ID of the security group attached to ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

# IAM role outputs
output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

# Auto-scaling outputs
output "autoscaling_target_arns" {
  description = "Map of service names to their auto-scaling target ARNs"
  value = {
    for name, target in aws_appautoscaling_target.ecs_target : name => target.resource_id
  }
}

# Task definition outputs
output "task_definition_arns" {
  description = "Map of service names to their active task definition ARNs"
  value = {
    for name, td in aws_ecs_task_definition.services : name => td.arn
  }
}

# Monitoring endpoints
output "cloudwatch_log_groups" {
  description = "Map of service names to their CloudWatch log group names"
  value = {
    for name, _ in var.services : name => "/ecs/${var.environment}/${name}"
  }
}

# Capacity provider outputs
output "capacity_providers" {
  description = "List of capacity providers associated with the cluster"
  value       = var.capacity_providers
}

# Environment metadata
output "environment" {
  description = "Environment name where the ECS cluster is deployed"
  value       = var.environment
}