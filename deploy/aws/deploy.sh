#!/usr/bin/env bash
# Builds the site, uploads it to the S3 bucket and invalidates the CloudFront cache.
# Usage: AWS_PROFILE=hotel ./deploy/aws/deploy.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1 # keeps Git Bash on Windows from rewriting /paths in arguments

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="hotel-frontend-$ACCOUNT"
DISTRIBUTION_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='hotel-reservations'].Id | [0]" --output text)"

npm ci
npm run build
aws s3 sync dist "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*' >/dev/null
echo "Deployed. Site: https://$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query Distribution.DomainName --output text)"
