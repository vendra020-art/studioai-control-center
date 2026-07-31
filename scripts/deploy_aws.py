from __future__ import annotations

import argparse
import json
import mimetypes
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError, NoCredentialsError


PROJECT_NAME = "StudioAI Control Center"
COMMENT = "StudioAI Control Center static web application"
ORIGIN_ID = "studioai-s3-origin"
OAC_NAME = "studioai-control-center-oac"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy StudioAI to private S3 with CloudFront OAC.")
    parser.add_argument("--source", default="dist-aws", help="Static build directory")
    parser.add_argument("--region", default="us-east-1", help="AWS region for the S3 bucket")
    parser.add_argument("--bucket", help="Globally unique S3 bucket name")
    parser.add_argument("--profile", help="Optional AWS shared-credentials profile")
    return parser.parse_args()


def ensure_bucket(s3, bucket: str, region: str) -> None:
    try:
        s3.head_bucket(Bucket=bucket)
    except ClientError as error:
        code = str(error.response.get("Error", {}).get("Code", ""))
        if code not in {"404", "NoSuchBucket", "NotFound"}:
            raise
        args = {"Bucket": bucket}
        if region != "us-east-1":
            args["CreateBucketConfiguration"] = {"LocationConstraint": region}
        s3.create_bucket(**args)
    s3.put_public_access_block(
        Bucket=bucket,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
    )
    s3.put_bucket_ownership_controls(
        Bucket=bucket,
        OwnershipControls={"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]},
    )
    s3.put_bucket_encryption(
        Bucket=bucket,
        ServerSideEncryptionConfiguration={
            "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
        },
    )
    s3.put_bucket_versioning(Bucket=bucket, VersioningConfiguration={"Status": "Enabled"})
    s3.put_bucket_lifecycle_configuration(
        Bucket=bucket,
        LifecycleConfiguration={
            "Rules": [{
                "ID": "expire-old-noncurrent-versions",
                "Status": "Enabled",
                "Filter": {"Prefix": ""},
                "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
            }]
        },
    )


def upload_site(s3, bucket: str, source: Path) -> None:
    for file_path in source.rglob("*"):
        if not file_path.is_file() or file_path.name.endswith(".map"):
            continue
        key = file_path.relative_to(source).as_posix()
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        cache_control = "no-cache, no-store, must-revalidate" if key == "index.html" else "public, max-age=31536000, immutable"
        s3.upload_file(
            str(file_path),
            bucket,
            key,
            ExtraArgs={"ContentType": content_type, "CacheControl": cache_control},
        )


def find_or_create_oac(cloudfront) -> str:
    marker = None
    while True:
        args = {"Marker": marker} if marker else {}
        response = cloudfront.list_origin_access_controls(**args)
        listing = response.get("OriginAccessControlList", {})
        for item in listing.get("Items", []):
            if item.get("Name") == OAC_NAME:
                return item["Id"]
        if not listing.get("IsTruncated"):
            break
        marker = listing.get("NextMarker")
    created = cloudfront.create_origin_access_control(
        OriginAccessControlConfig={
            "Name": OAC_NAME,
            "Description": "Private S3 access for StudioAI CloudFront distribution",
            "SigningProtocol": "sigv4",
            "SigningBehavior": "always",
            "OriginAccessControlOriginType": "s3",
        }
    )
    return created["OriginAccessControl"]["Id"]


def find_distribution(cloudfront):
    marker = None
    while True:
        args = {"Marker": marker} if marker else {}
        response = cloudfront.list_distributions(**args)
        listing = response.get("DistributionList", {})
        for item in listing.get("Items", []):
            if item.get("Comment") == COMMENT:
                return item
        if not listing.get("IsTruncated"):
            return None
        marker = listing.get("NextMarker")


def create_distribution(cloudfront, bucket: str, region: str, oac_id: str):
    response = cloudfront.create_distribution(
        DistributionConfig={
            "CallerReference": f"studioai-{bucket}",
            "Aliases": {"Quantity": 0},
            "DefaultRootObject": "index.html",
            "Comment": COMMENT,
            "Enabled": True,
            "IsIPV6Enabled": True,
            "HttpVersion": "http2and3",
            "PriceClass": "PriceClass_100",
            "Origins": {
                "Quantity": 1,
                "Items": [{
                    "Id": ORIGIN_ID,
                    "DomainName": f"{bucket}.s3.{region}.amazonaws.com",
                    "OriginAccessControlId": oac_id,
                    "S3OriginConfig": {"OriginAccessIdentity": ""},
                    "ConnectionAttempts": 3,
                    "ConnectionTimeout": 10,
                }],
            },
            "DefaultCacheBehavior": {
                "TargetOriginId": ORIGIN_ID,
                "ViewerProtocolPolicy": "redirect-to-https",
                "AllowedMethods": {"Quantity": 3, "Items": ["GET", "HEAD", "OPTIONS"], "CachedMethods": {"Quantity": 3, "Items": ["GET", "HEAD", "OPTIONS"]}},
                "Compress": True,
                "ForwardedValues": {"QueryString": False, "Cookies": {"Forward": "none"}},
                "MinTTL": 0,
                "DefaultTTL": 86400,
                "MaxTTL": 31536000,
                "TrustedSigners": {"Enabled": False, "Quantity": 0},
                "TrustedKeyGroups": {"Enabled": False, "Quantity": 0},
            },
            "CacheBehaviors": {"Quantity": 0},
            "CustomErrorResponses": {
                "Quantity": 2,
                "Items": [
                    {"ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0},
                    {"ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0},
                ],
            },
            "Restrictions": {"GeoRestriction": {"RestrictionType": "none", "Quantity": 0}},
            "ViewerCertificate": {"CloudFrontDefaultCertificate": True, "MinimumProtocolVersion": "TLSv1", "CertificateSource": "cloudfront"},
        }
    )
    return response["Distribution"]


def apply_bucket_policy(s3, bucket: str, account: str, distribution_id: str) -> None:
    distribution_arn = f"arn:aws:cloudfront::{account}:distribution/{distribution_id}"
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipalReadOnly",
                "Effect": "Allow",
                "Principal": {"Service": "cloudfront.amazonaws.com"},
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket}/*",
                "Condition": {"StringEquals": {"AWS:SourceArn": distribution_arn}},
            },
            {
                "Sid": "DenyInsecureTransport",
                "Effect": "Deny",
                "Principal": "*",
                "Action": "s3:*",
                "Resource": [f"arn:aws:s3:::{bucket}", f"arn:aws:s3:::{bucket}/*"],
                "Condition": {"Bool": {"aws:SecureTransport": "false"}},
            },
        ],
    }
    s3.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))


def main() -> int:
    args = parse_args()
    source = Path(args.source).resolve()
    if not (source / "index.html").is_file():
        raise SystemExit(f"Static build is missing: {source / 'index.html'}")
    try:
        session = boto3.Session(profile_name=args.profile, region_name=args.region)
        identity = session.client("sts").get_caller_identity()
        account = identity["Account"]
        bucket = args.bucket or f"studioai-ui-prod-{account}-{args.region}"
        s3 = session.client("s3", region_name=args.region)
        cloudfront = session.client("cloudfront")
        ensure_bucket(s3, bucket, args.region)
        upload_site(s3, bucket, source)
        oac_id = find_or_create_oac(cloudfront)
        distribution = find_distribution(cloudfront) or create_distribution(cloudfront, bucket, args.region, oac_id)
        apply_bucket_policy(s3, bucket, account, distribution["Id"])
        cloudfront.create_invalidation(
            DistributionId=distribution["Id"],
            InvalidationBatch={"Paths": {"Quantity": 1, "Items": ["/*"]}, "CallerReference": f"studioai-{distribution['Id']}-{int(__import__('time').time())}"},
        )
        print(json.dumps({"s3_uri": f"s3://{bucket}", "distribution_id": distribution["Id"], "cloudfront_url": f"https://{distribution['DomainName']}"}, indent=2))
        return 0
    except NoCredentialsError:
        print("AWS credentials are not configured.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
