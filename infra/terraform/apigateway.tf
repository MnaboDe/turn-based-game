resource "aws_apigatewayv2_api" "matchmaking" {
  name          = var.api_gateway_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["authorization", "content-type"]
    allow_methods     = ["GET", "OPTIONS", "POST"]
    allow_origins     = var.api_gateway_cors_allow_origins
    expose_headers    = []
    max_age           = 0
  }
}

resource "aws_apigatewayv2_integration" "matchmaking_lambda" {
  api_id                 = aws_apigatewayv2_api.matchmaking.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.matchmaking.arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "matches_current" {
  api_id             = aws_apigatewayv2_api.matchmaking.id
  route_key          = "GET /matches/current"
  target             = "integrations/${aws_apigatewayv2_integration.matchmaking_lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "matches_move" {
  api_id             = aws_apigatewayv2_api.matchmaking.id
  route_key          = "POST /matches/move"
  target             = "integrations/${aws_apigatewayv2_integration.matchmaking_lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "matchmaking_status" {
  api_id             = aws_apigatewayv2_api.matchmaking.id
  route_key          = "GET /matchmaking/status"
  target             = "integrations/${aws_apigatewayv2_integration.matchmaking_lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "matchmaking_join" {
  api_id             = aws_apigatewayv2_api.matchmaking.id
  route_key          = "POST /matchmaking/join"
  target             = "integrations/${aws_apigatewayv2_integration.matchmaking_lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "matchmaking_cancel" {
  api_id             = aws_apigatewayv2_api.matchmaking.id
  route_key          = "POST /matchmaking/cancel"
  target             = "integrations/${aws_apigatewayv2_integration.matchmaking_lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.matchmaking.id
  name        = var.api_gateway_stage_name
  auto_deploy = true
}

resource "aws_lambda_permission" "allow_matchmaking_status" {
  statement_id  = "702c02d1-2a46-5444-b7c0-c14e4396cf0e"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matchmaking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.matchmaking.execution_arn}/*/*/matchmaking/status"
}

resource "aws_lambda_permission" "allow_matchmaking_join" {
  statement_id  = "4ca3b3c9-47f5-50c3-8ac8-2424115c0c20"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matchmaking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.matchmaking.execution_arn}/*/*/matchmaking/join"
}

resource "aws_lambda_permission" "allow_matchmaking_cancel" {
  statement_id  = "5dc48082-90a4-5c6d-b384-5470672ddc9b"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matchmaking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.matchmaking.execution_arn}/*/*/matchmaking/cancel"
}

resource "aws_lambda_permission" "allow_matches_current" {
  statement_id  = "cb53d019-b591-5cc2-a428-6986522e3c5a"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matchmaking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.matchmaking.execution_arn}/*/*/matchmaking/current"
}

resource "aws_lambda_permission" "allow_matches_move" {
  statement_id  = "eaee7583-dd17-5c86-84f9-0764236844b2"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matchmaking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.matchmaking.execution_arn}/*/*/matchmaking/move"
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.matchmaking.id
  name             = "${var.project_name}-${var.environment}-cognito-authorizer"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.frontend.id]
    issuer   = "https://${aws_cognito_user_pool.main.endpoint}"
  }
}