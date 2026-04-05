resource "aws_cloudfront_distribution" "frontend" {
  enabled             = var.frontend_cloudfront_enabled
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  wait_for_deployment = true
  web_acl_id          = var.frontend_waf_web_acl_arn

  tags = {
    Name = "${var.project_name}-${var.environment}-cloudfront"
  }

  origin {
    domain_name                = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id                  = var.frontend_origin_id
    response_completion_timeout = 0

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      ip_address_type        = "ipv4"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = var.frontend_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}