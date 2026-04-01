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

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = aws_s3_bucket.frontend.bucket
}