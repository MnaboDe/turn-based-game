output "aws_region" {
  description = "AWS region used by this Terraform configuration."
  value       = var.aws_region
}

output "project_name" {
  description = "Project name used by this Terraform configuration."
  value       = var.project_name
}

output "environment" {
  description = "Environment used by this Terraform configuration."
  value       = var.environment
}