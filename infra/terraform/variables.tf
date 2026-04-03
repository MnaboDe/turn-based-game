variable "aws_region" {
  description = "AWS region for all project resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used in tags and resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "frontend_bucket_name" {
  description = "Existing S3 bucket name for frontend hosting."
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "Existing CloudFront distribution ID for frontend delivery."
  type        = string
}

variable "frontend_waf_web_acl_arn" {
  description = "WAF Web ACL ARN for the frontend CloudFront distribution."
  type        = string
  default     = null
}

variable "frontend_cloudfront_enabled" {
  description = "Whether the frontend CloudFront distribution is enabled."
  type        = bool
  default     = true
}

variable "frontend_origin_id" {
  description = "Origin ID for the frontend CloudFront distribution."
  type        = string
}

variable "waiting_queue_table_name" {
  description = "Existing DynamoDB table name for the waiting queue."
  type        = string
}

variable "matches_table_name" {
  description = "Existing DynamoDB table name for matches."
  type        = string
}