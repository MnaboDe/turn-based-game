variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "terraform_state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform state"
  type        = string
}