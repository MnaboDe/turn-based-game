resource "aws_cognito_user_pool" "main" {
  name                     = var.cognito_user_pool_name
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"
  mfa_configuration        = "OFF"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }

    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  password_policy {
    minimum_length                   = 8
    password_history_size            = 0
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "displayName"
    required                 = false

    string_attribute_constraints {}
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD"]
  }

  username_configuration {
    case_sensitive = false
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }
}

resource "aws_cognito_user_pool_client" "frontend" {
  name         = var.cognito_user_pool_client_name
  user_pool_id = aws_cognito_user_pool.main.id

  callback_urls = var.cognito_callback_urls
  logout_urls   = var.cognito_logout_urls

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes = [
    "aws.cognito.signin.user.admin",
    "email",
    "openid",
    "phone",
  ]

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  supported_identity_providers = ["COGNITO"]

  access_token_validity = 60
  id_token_validity     = 60
  refresh_token_validity = 5
  auth_session_validity  = 3

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  enable_propagate_additional_user_context_data = false
  enable_token_revocation                       = true
  prevent_user_existence_errors                 = "ENABLED"

  read_attributes  = []
  write_attributes = []
}

resource "aws_cognito_user_pool_domain" "main" {
  domain                = var.cognito_domain_prefix
  user_pool_id          = aws_cognito_user_pool.main.id
  managed_login_version = 2
}