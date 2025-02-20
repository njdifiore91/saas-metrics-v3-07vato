# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data source for available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Local variables for resource configuration
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "startup-metrics-platform"
  }

  az_names = data.aws_availability_zones.available.names

  subnet_configs = {
    public = {
      netnum_offset = 0
      name_prefix   = "public"
      nacl_rules = {
        ingress = [
          {
            rule_no    = 100
            protocol   = -1
            action     = "allow"
            cidr_block = "0.0.0.0/0"
            from_port  = 0
            to_port    = 0
          }
        ]
        egress = [
          {
            rule_no    = 100
            protocol   = -1
            action     = "allow"
            cidr_block = "0.0.0.0/0"
            from_port  = 0
            to_port    = 0
          }
        ]
      }
    }
    private = {
      netnum_offset = 100
      name_prefix   = "private"
      nacl_rules = {
        ingress = [
          {
            rule_no    = 100
            protocol   = -1
            action     = "allow"
            cidr_block = var.vpc_cidr
            from_port  = 0
            to_port    = 0
          }
        ]
        egress = [
          {
            rule_no    = 100
            protocol   = -1
            action     = "allow"
            cidr_block = "0.0.0.0/0"
            from_port  = 0
            to_port    = 0
          }
        ]
      }
    }
    database = {
      netnum_offset = 200
      name_prefix   = "database"
      nacl_rules = {
        ingress = [
          {
            rule_no    = 100
            protocol   = "tcp"
            action     = "allow"
            cidr_block = var.vpc_cidr
            from_port  = 5432
            to_port    = 5432
          }
        ]
        egress = [
          {
            rule_no    = 100
            protocol   = -1
            action     = "allow"
            cidr_block = var.vpc_cidr
            from_port  = 0
            to_port    = 0
          }
        ]
      }
    }
  }
}

# VPC Resource
resource "aws_vpc" "main" {
  cidr_block                           = var.vpc_cidr
  enable_dns_hostnames                 = true
  enable_dns_support                   = true
  enable_network_address_usage_metrics = true

  tags = merge(local.common_tags, {
    Name = "${var.environment}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igw"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = var.environment == "prod" ? var.az_count : 1
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = format("%s-eip-nat-%s", var.environment, local.az_names[count.index])
  })
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = var.environment == "prod" ? var.az_count : 1
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.main[count.index].id

  tags = merge(local.common_tags, {
    Name = format("%s-nat-%s", var.environment, local.az_names[count.index])
  })

  depends_on = [aws_internet_gateway.main]
}

# Subnets
resource "aws_subnet" "main" {
  count                   = var.az_count * 3
  vpc_id                  = aws_vpc.main.id
  cidr_block             = cidrsubnet(var.vpc_cidr, 8, count.index + local.subnet_configs[floor(count.index/var.az_count)].netnum_offset)
  availability_zone      = local.az_names[count.index % var.az_count]
  map_public_ip_on_launch = floor(count.index/var.az_count) == 0

  tags = merge(local.common_tags, {
    Name = format("%s-%s-subnet-%s",
      var.environment,
      local.subnet_configs[floor(count.index/var.az_count)].name_prefix,
      local.az_names[count.index % var.az_count]
    )
  })
}

# Route Tables
resource "aws_route_table" "main" {
  count  = 3 * var.az_count
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = format("%s-%s-rt-%s",
      var.environment,
      local.subnet_configs[floor(count.index/var.az_count)].name_prefix,
      local.az_names[count.index % var.az_count]
    )
  })
}

# Routes
resource "aws_route" "public_internet_gateway" {
  count                  = var.az_count
  route_table_id         = aws_route_table.main[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route" "private_nat_gateway" {
  count                  = var.az_count * 2
  route_table_id         = aws_route_table.main[var.az_count + count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = var.environment == "prod" ? aws_nat_gateway.main[count.index % var.az_count].id : aws_nat_gateway.main[0].id
}

# Route Table Associations
resource "aws_route_table_association" "main" {
  count          = var.az_count * 3
  subnet_id      = aws_subnet.main[count.index].id
  route_table_id = aws_route_table.main[count.index].id
}

# Network ACLs
resource "aws_network_acl" "main" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  subnet_ids = [for i in range(var.az_count) : aws_subnet.main[count.index * var.az_count + i].id]

  dynamic "ingress" {
    for_each = local.subnet_configs[keys(local.subnet_configs)[count.index]].nacl_rules.ingress
    content {
      rule_no    = ingress.value.rule_no
      protocol   = ingress.value.protocol
      action     = ingress.value.action
      cidr_block = ingress.value.cidr_block
      from_port  = ingress.value.from_port
      to_port    = ingress.value.to_port
    }
  }

  dynamic "egress" {
    for_each = local.subnet_configs[keys(local.subnet_configs)[count.index]].nacl_rules.egress
    content {
      rule_no    = egress.value.rule_no
      protocol   = egress.value.protocol
      action     = egress.value.action
      cidr_block = egress.value.cidr_block
      from_port  = egress.value.from_port
      to_port    = egress.value.to_port
    }
  }

  tags = merge(local.common_tags, {
    Name = format("%s-%s-nacl",
      var.environment,
      local.subnet_configs[keys(local.subnet_configs)[count.index]].name_prefix
    )
  })
}

# Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "subnet_ids" {
  description = "Map of subnet IDs by tier"
  value = {
    public   = [for i in range(var.az_count) : aws_subnet.main[i].id]
    private  = [for i in range(var.az_count) : aws_subnet.main[var.az_count + i].id]
    database = [for i in range(var.az_count) : aws_subnet.main[2 * var.az_count + i].id]
  }
}

output "route_table_ids" {
  description = "List of route table IDs"
  value = {
    public   = [for i in range(var.az_count) : aws_route_table.main[i].id]
    private  = [for i in range(var.az_count) : aws_route_table.main[var.az_count + i].id]
    database = [for i in range(var.az_count) : aws_route_table.main[2 * var.az_count + i].id]
  }
}