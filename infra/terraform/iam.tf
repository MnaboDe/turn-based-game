resource "aws_iam_role" "matchmaking_lambda" {
  name = var.matchmaking_lambda_role_name
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "matchmaking_lambda_basic" {
  role       = aws_iam_role.matchmaking_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "matchmaking_dynamo" {
  name = var.matchmaking_lambda_inline_policy_name
  role = aws_iam_role.matchmaking_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "MatchmakingDynamoAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.waiting_queue.arn,
          "${aws_dynamodb_table.waiting_queue.arn}/index/status-joinedAt-index",
          aws_dynamodb_table.matches.arn,
          "${aws_dynamodb_table.matches.arn}/index/player1-index",
          "${aws_dynamodb_table.matches.arn}/index/player2-index"
        ]
      }
    ]
  })
}