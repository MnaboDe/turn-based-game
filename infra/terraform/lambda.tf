resource "aws_lambda_function" "matchmaking" {
  function_name = var.matchmaking_lambda_name
  role          = var.matchmaking_lambda_role_arn
  handler       = "index.handler"
  runtime       = "nodejs24.x"
  memory_size   = 128
  timeout       = 10
  architectures = ["x86_64"]

  filename = var.matchmaking_lambda_package_path

  environment {
    variables = {
      (var.matches_table_env_var_name)       = var.matches_table_name
      (var.waiting_queue_table_env_var_name) = var.waiting_queue_table_name
    }
  }

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}