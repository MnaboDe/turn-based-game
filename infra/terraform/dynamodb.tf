resource "aws_dynamodb_table" "waiting_queue" {
  name         = var.waiting_queue_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "playerId"

  attribute {
    name = "playerId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "joinedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "status-joinedAt-index"
    hash_key        = "status"
    range_key       = "joinedAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name = var.waiting_queue_table_name
  }
}

resource "aws_dynamodb_table" "matches" {
  name         = var.matches_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "matchId"

  attribute {
    name = "matchId"
    type = "S"
  }

  attribute {
    name = "player1"
    type = "S"
  }

  attribute {
    name = "player2"
    type = "S"
  }

  global_secondary_index {
    name            = "player1-index"
    hash_key        = "player1"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "player2-index"
    hash_key        = "player2"
    projection_type = "ALL"
  }

  tags = {
    Name = var.matches_table_name
  }
}