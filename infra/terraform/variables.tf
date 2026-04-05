variable "aws_region" {
  description = "AWS region for all project resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used in resource naming and tagging."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend hosting."
  type        = string
}

variable "frontend_waf_web_acl_arn" {
  description = "Optional WAF Web ACL ARN for the frontend CloudFront distribution."
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
  description = "DynamoDB table name for the waiting queue."
  type        = string
}

variable "matches_table_name" {
  description = "DynamoDB table name for matches."
  type        = string
}

variable "matchmaking_lambda_name" {
  description = "Lambda function name for matchmaking."
  type        = string
}

variable "matches_table_env_var_name" {
  description = "Environment variable name for the matches table."
  type        = string
  default     = "MATCHES_TABLE"
}

variable "waiting_queue_table_env_var_name" {
  description = "Environment variable name for the waiting queue table."
  type        = string
  default     = "WAITING_QUEUE_TABLE"
}

variable "matchmaking_lambda_package_path" {
  description = "Path to the local Lambda deployment package."
  type        = string
}

variable "matchmaking_lambda_role_name" {
  description = "IAM role name for the matchmaking Lambda function."
  type        = string
}

variable "matchmaking_lambda_inline_policy_name" {
  description = "Inline IAM policy name for the matchmaking Lambda function."
  type        = string
}

variable "api_gateway_name" {
  description = "HTTP API name."
  type        = string
}

variable "api_gateway_cors_allow_origins" {
  description = "Allowed origins for API Gateway CORS."
  type        = list(string)
}

variable "api_gateway_stage_name" {
  description = "API Gateway stage name."
  type        = string
}

variable "cognito_user_pool_name" {
  description = "Cognito User Pool name."
  type        = string
}

variable "cognito_user_pool_client_name" {
  description = "Cognito User Pool app client name."
  type        = string
}

variable "cognito_domain_prefix" {
  description = "Cognito Hosted UI domain prefix."
  type        = string
}

variable "cognito_callback_urls" {
  description = "Allowed callback URLs for Cognito Hosted UI."
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Allowed logout URLs for Cognito Hosted UI."
  type        = list(string)
}