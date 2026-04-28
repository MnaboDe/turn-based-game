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
  description = "S3 bucket name for frontend hosting."
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for the frontend."
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_cloudfront_domain_name" {
  description = "CloudFront domain name for the frontend."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "api_gateway_id" {
  description = "HTTP API ID."
  value       = aws_apigatewayv2_api.matchmaking.id
}

output "api_gateway_endpoint" {
  description = "HTTP API invoke URL."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "matchmaking_lambda_name" {
  description = "Matchmaking Lambda function name."
  value       = aws_lambda_function.matchmaking.function_name
}

output "waiting_queue_table_name" {
  description = "DynamoDB waiting queue table name."
  value       = aws_dynamodb_table.waiting_queue.name
}

output "matches_table_name" {
  description = "DynamoDB matches table name."
  value       = aws_dynamodb_table.matches.name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool app client ID."
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI domain."
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_hosted_ui_base_url" {
  description = "Base URL for Cognito Hosted UI."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "github_actions_deploy_role_arn" {
  value = aws_iam_role.github_actions_deploy.arn
}