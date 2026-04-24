"""
AWS Credentials Setup Guide

This script provides guidance for setting up AWS credentials
for the dam system to connect to real SQS.
"""

import os
from pathlib import Path


def setup_aws_credentials_guide():
    """Print AWS credentials setup instructions"""
    
    print("""
=== AWS CREDENTIALS SETUP GUIDE ===

The dam system needs AWS credentials to connect to SQS.
Here are the setup options:

OPTION 1: AWS CLI (Recommended)
-----------------------------
Run these commands in terminal:

aws configure
AWS Access Key ID: [YOUR_ACCESS_KEY]
AWS Secret Access Key: [YOUR_SECRET_KEY]
Default region name: us-east-1
Default output format: json

This creates ~/.aws/credentials and ~/.aws/config files.

OPTION 2: Environment Variables
-------------------------------
Set these environment variables:

export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here  
export AWS_DEFAULT_REGION=us-east-1

OPTION 3: IAM Role (EC2 instances)
----------------------------------
If running on EC2, attach an IAM role with SQS permissions.

REQUIRED SQS SETUP
------------------
1. Create SQS FIFO queue:
   aws sqs create-queue \\
     --queue-name kite-sessions-dam.fifo \\
     --region us-east-1 \\
     --attributes FifoQueue=true,ContentBasedDeduplication=true

2. Update dam/config.py with correct queue URL:
   DAM_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/kite-sessions-dam.fifo

3. Ensure IAM permissions:
   - sqs:SendMessage
   - sqs:ReceiveMessage  
   - sqs:DeleteMessage
   - sqs:GetQueueAttributes
   - sqs:ChangeMessageVisibility

TESTING CONNECTION
-----------------
After setup, test with:
curl http://localhost:8081/dam/health

Should return: {"healthy":true,"engine":"SQSEngine",...}
""")

def check_aws_credentials():
    """Check if AWS credentials are available"""
    
    print("=== CHECKING AWS CREDENTIALS ===")
    
    # Check environment variables
    access_key = os.getenv('AWS_ACCESS_KEY_ID')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    region = os.getenv('AWS_DEFAULT_REGION')
    
    if access_key and secret_key:
        print("✓ AWS credentials found in environment variables")
        print(f"  Region: {region or 'Not set'}")
        return True
    
    # Check AWS CLI credentials file
    aws_creds = Path.home() / '.aws' / 'credentials'
    if aws_creds.exists():
        print("✓ AWS CLI credentials file found")
        print(f"  Path: {aws_creds}")
        return True
    
    # Check AWS config file  
    aws_config = Path.home() / '.aws' / 'config'
    if aws_config.exists():
        print("✓ AWS CLI config file found")
        print(f"  Path: {aws_config}")
        return True
    
    print("✗ No AWS credentials found")
    print("Please run setup_aws_credentials_guide() for instructions")
    return False

def test_sqs_connection():
    """Test connection to SQS"""
    
    print("=== TESTING SQS CONNECTION ===")
    
    try:
        import boto3
        from dam.config import dam_config
        
        # Create SQS client
        sqs_client = boto3.client(
            'sqs',
            region_name=dam_config.sqs_region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        
        # Test queue access
        response = sqs_client.get_queue_attributes(
            QueueUrl=dam_config.sqs_queue_url,
            AttributeNames=['QueueArn']
        )
        
        if 'QueueArn' in response.get('Attributes', {}):
            print("✓ SQS connection successful")
            print(f"  Queue URL: {dam_config.sqs_queue_url}")
            print(f"  Queue ARN: {response['Attributes']['QueueArn']}")
            return True
        else:
            print("✗ SQS queue not accessible")
            return False
            
    except Exception as e:
        print(f"✗ SQS connection failed: {e}")
        return False

if __name__ == "__main__":
    setup_aws_credentials_guide()
    
    print("\n" + "="*50 + "\n")
    
    if check_aws_credentials():
        print("\n" + "="*50 + "\n")
        test_sqs_connection()
