# VPC ID output for reference by other modules
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

# Public subnet IDs for web tier resources (ALB, etc)
output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = [for i in range(var.az_count) : aws_subnet.main[i].id]
}

# Private subnet IDs for application tier resources (ECS tasks, etc)
output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = [for i in range(var.az_count) : aws_subnet.main[var.az_count + i].id]
}

# Database subnet IDs for data tier resources (RDS, ElastiCache, etc)
output "database_subnet_ids" {
  description = "List of database subnet IDs"
  value       = [for i in range(var.az_count) : aws_subnet.main[2 * var.az_count + i].id]
}

# NAT Gateway public IPs for reference and security group rules
output "nat_public_ips" {
  description = "List of public IPs assigned to NAT Gateways"
  value       = aws_nat_gateway.main[*].public_ip
}