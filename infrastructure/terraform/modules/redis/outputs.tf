# Output definitions for AWS ElastiCache Redis cluster module
# terraform ~> 5.0
# Provider: hashicorp/aws ~> 5.0

output "redis_endpoint" {
  description = "Primary endpoint address for Redis cluster"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Port number for Redis cluster"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "Security group ID for Redis cluster"
  value       = aws_security_group.redis.id
}

output "redis_connection_string" {
  description = "Full connection string for Redis cluster"
  value       = format("redis://%s:%s", 
    aws_elasticache_replication_group.redis.primary_endpoint_address,
    aws_elasticache_replication_group.redis.port
  )
}