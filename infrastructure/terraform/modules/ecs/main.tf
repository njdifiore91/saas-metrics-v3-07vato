terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Common tags for all resources
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "startup-metrics-platform"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  capacity_providers = var.capacity_providers

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 60
    base             = 1
  }

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 40
    base             = 0
  }

  setting {
    name  = "containerInsights"
    value = var.container_insights ? "enabled" : "disabled"
  }

  tags = merge(local.common_tags, {
    Name = var.cluster_name
  })
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "${var.cluster_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "${var.cluster_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.cluster_name}-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-tasks-sg"
  })
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "services" {
  for_each = var.services

  family                   = each.key
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = each.value.cpu
  memory                  = each.value.memory
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  task_role_arn          = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = each.key
      image = "${each.value.container_image}:${each.value.container_tag}"
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.environment}/${each.key}"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }

      portMappings = [
        {
          containerPort = each.value.container_port
          protocol      = "tcp"
        }
      ]

      environment = each.value.environment_variables
      secrets     = each.value.secrets

      healthCheck = {
        command     = ["CMD-SHELL", each.value.health_check_command]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture       = "X86_64"
  }

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# ECS Services
resource "aws_ecs_service" "services" {
  for_each = var.services

  name                = each.key
  cluster             = aws_ecs_cluster.main.id
  task_definition     = aws_ecs_task_definition.services[each.key].arn
  desired_count       = each.value.desired_count
  launch_type         = "FARGATE"
  platform_version    = "LATEST"
  propagate_tags      = "SERVICE"
  enable_execute_command = var.environment != "prod"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = each.value.load_balancer != null ? [each.value.load_balancer] : []
    content {
      target_group_arn = load_balancer.value.target_group_arn
      container_name   = each.key
      container_port   = each.value.container_port
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period_seconds = 60

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  for_each = var.services

  max_capacity       = each.value.auto_scaling.max_capacity
  min_capacity       = each.value.auto_scaling.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  for_each = var.services

  name               = "${each.key}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = each.value.auto_scaling.target_cpu_utilization
  }
}

# Data source for current AWS region
data "aws_region" "current" {}