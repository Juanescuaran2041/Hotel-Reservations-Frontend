#!/usr/bin/env bash
# Creates the private S3 bucket and the CloudFront distribution that serves the site over HTTPS
# and forwards /api/* to the backend EC2 instance (see the backend repo, deploy/aws/provision.sh).
# Usage: AWS_PROFILE=hotel API_ORIGIN_DNS=ec2-1-2-3-4.compute-1.amazonaws.com ./deploy/aws/provision.sh
# Safe to re-run: existing resources are reused.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # keeps Git Bash on Windows from rewriting /paths in arguments

: "${API_ORIGIN_DNS:?Set API_ORIGIN_DNS to the public DNS name printed by the backend provision script}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="hotel-frontend-$ACCOUNT"
REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$REGION"
COMMENT="hotel-reservations"

# 1. Private bucket -------------------------------------------------------------
aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1 \
  || aws s3api create-bucket --bucket "$BUCKET" >/dev/null
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 2. Origin access control (CloudFront is the only reader of the bucket) ----------
OAC_ID="$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$BUCKET'].Id | [0]" --output text)"
if [ "$OAC_ID" = "None" ]; then
  OAC_ID="$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=$BUCKET,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)"
fi

# 3. SPA routing: unknown paths without a file extension serve index.html ---------
FUNCTION_NAME="hotel-spa-rewrite"
FUNCTION_CODE='function handler(event) { var request = event.request; if (request.uri.indexOf(".") === -1) { request.uri = "/index.html"; } return request; }'
if ! aws cloudfront describe-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  ETAG="$(aws cloudfront create-function --name "$FUNCTION_NAME" \
    --function-config Comment=spa-rewrite,Runtime=cloudfront-js-2.0 \
    --cli-binary-format raw-in-base64-out --function-code "$FUNCTION_CODE" --query ETag --output text)"
  aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG" >/dev/null
fi
FUNCTION_ARN="$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE \
  --query FunctionSummary.FunctionMetadata.FunctionARN --output text)"

# 4. Distribution ----------------------------------------------------------------
cache_policy_id() { aws cloudfront list-cache-policies --type managed \
  --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='$1'].CachePolicy.Id | [0]" --output text; }
CACHE_OPTIMIZED="$(cache_policy_id Managed-CachingOptimized)"
CACHE_DISABLED="$(cache_policy_id Managed-CachingDisabled)"
ALL_VIEWER_NO_HOST="$(aws cloudfront list-origin-request-policies --type managed \
  --query "OriginRequestPolicyList.Items[?OriginRequestPolicy.OriginRequestPolicyConfig.Name=='Managed-AllViewerExceptHostHeader'].OriginRequestPolicy.Id | [0]" \
  --output text)"

DISTRIBUTION_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$COMMENT'].Id | [0]" --output text)"
if [ "$DISTRIBUTION_ID" = "None" ]; then
  CONFIG="$(cat <<EOF
{
  "CallerReference": "hotel-$(date +%s)",
  "Comment": "$COMMENT",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "Origins": {"Quantity": 2, "Items": [
    {"Id": "site", "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
     "OriginAccessControlId": "$OAC_ID", "S3OriginConfig": {"OriginAccessIdentity": ""}},
    {"Id": "api", "DomainName": "$API_ORIGIN_DNS",
     "CustomOriginConfig": {"HTTPPort": 8080, "HTTPSPort": 443, "OriginProtocolPolicy": "http-only",
       "OriginReadTimeout": 30}}
  ]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "site", "ViewerProtocolPolicy": "redirect-to-https", "Compress": true,
    "CachePolicyId": "$CACHE_OPTIMIZED",
    "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
    "FunctionAssociations": {"Quantity": 1, "Items": [
      {"EventType": "viewer-request", "FunctionARN": "$FUNCTION_ARN"}]}
  },
  "CacheBehaviors": {"Quantity": 1, "Items": [{
    "PathPattern": "/api/*", "TargetOriginId": "api", "ViewerProtocolPolicy": "https-only",
    "Compress": true, "CachePolicyId": "$CACHE_DISABLED", "OriginRequestPolicyId": "$ALL_VIEWER_NO_HOST",
    "AllowedMethods": {"Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]}
  }]}
}
EOF
)"
  DISTRIBUTION_ID="$(aws cloudfront create-distribution --distribution-config "$CONFIG" \
    --query Distribution.Id --output text)"
fi
DISTRIBUTION_ARN="arn:aws:cloudfront::$ACCOUNT:distribution/$DISTRIBUTION_ID"
DOMAIN="$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query Distribution.DomainName --output text)"

# 5. Bucket policy: only this distribution may read the files ----------------------
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Effect\": \"Allow\",
    \"Principal\": {\"Service\": \"cloudfront.amazonaws.com\"},
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET/*\",
    \"Condition\": {\"StringEquals\": {\"AWS:SourceArn\": \"$DISTRIBUTION_ARN\"}}
  }]
}"

echo
echo "Distribution: $DISTRIBUTION_ID"
echo "Site URL:     https://$DOMAIN"
echo "Next: allow this origin in the backend and upload the site:"
echo "  (backend repo) CORS_ALLOWED_ORIGINS=https://$DOMAIN ./deploy/aws/redeploy.sh --config-only"
echo "  (this repo)    ./deploy/aws/deploy.sh"
