#!/usr/bin/env python3
"""
Manual AWS Setup Instructions

This script provides manual setup instructions since interactive input is not available.
"""

import os
import subprocess
import sys
from pathlib import Path


def print_setup_instructions():
    """Print manual setup instructions"""
    print("""
=== MANUAL AWS SETUP INSTRUCTIONS ===

STEP 1: CONFIGURE AWS CREDENTIALS
--------------------------------

Option A: Using AWS CLI (Recommended)
Run this command in terminal:
    aws configure

Then enter your credentials when prompted:
    AWS Access Key ID: [YOUR_ACCESS_KEY]
    AWS Secret Access Key: [YOUR_SECRET_KEY]
    Default region name: us-east-1
    Default output format: json

Option B: Using Environment Variables
Set these environment variables:
    export AWS_ACCESS_KEY_ID=your_access_key_here
    export AWS_SECRET_ACCESS_KEY=your_secret_key_here
    export AWS_DEFAULT_REGION=us-east-1

STEP 2: VERIFY CREDENTIALS
--------------------------
Run this command to verify:
    aws sts get-caller-identity

You should see your AWS account information.

STEP 3: CREATE SQS QUEUE
------------------------
Run this command to create the required FIFO queue:
    aws sqs create-queue \\
        --queue-name kite-sessions-dam.fifo \\
        --region us-east-1 \\
        --attributes \\
        FifoQueue=true,ContentBasedDeduplication=true,MessageRetentionPeriod=1209600

STEP 4: GET QUEUE URL
--------------------
Run this command to get the queue URL:
    aws sqs get-queue-url \\
        --queue-name kite-sessions-dam.fifo \\
        --region us-east-1

Update the DAM_SQS_QUEUE_URL in the .env file with the returned URL.

STEP 5: UPDATE .env FILE
-----------------------
Edit /Users/PER_TEST/raccolta_dati_K_test/dam/.env and set:
    AWS_ACCESS_KEY_ID=your_real_access_key
    AWS_SECRET_ACCESS_KEY=your_real_secret_key
    AWS_DEFAULT_REGION=us-east-1
    DAM_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/kite-sessions-dam.fifo

STEP 6: TEST CONNECTION
----------------------
Restart dam services and test:
    curl http://localhost:8081/dam/health

Should return: {"healthy":true,"engine":"SQSEngine",...}
""")


def check_aws_cli():
    """Check if AWS CLI is available"""
    try:
        result = subprocess.run(['aws', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ AWS CLI available: {result.stdout.strip()}")
            return True
        else:
            print("✗ AWS CLI not available")
            return False
    except FileNotFoundError:
        print("✗ AWS CLI not found")
        return False


def check_aws_credentials():
    """Check if AWS credentials are configured"""
    try:
        result = subprocess.run(['aws', 'sts', 'get-caller-identity'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ AWS credentials configured")
            print(f"   Identity: {result.stdout.strip()}")
            return True
        else:
            print("✗ AWS credentials not configured")
            print(f"   Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"✗ Error checking AWS credentials: {e}")
        return False


def check_sqs_queue():
    """Check if SQS queue exists"""
    queue_name = "kite-sessions-dam.fifo"
    region = "us-east-1"
    
    try:
        result = subprocess.run([
            'aws', 'sqs', 'get-queue-url',
            '--queue-name', queue_name,
            '--region', region
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ SQS queue exists: {queue_name}")
            print(f"   URL: {result.stdout.strip()}")
            return True
        else:
            print(f"✗ SQS queue not found: {queue_name}")
            print(f"   Error: {result.stderr.strip()}")
            return False
            
    except Exception as e:
        print(f"✗ Error checking SQS queue: {e}")
        return False


def test_dam_health():
    """Test dam health endpoint"""
    try:
        import requests
        response = requests.get('http://localhost:8081/dam/health', timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            if health_data.get('healthy'):
                print("✓ Dam SQS connection healthy")
                print(f"   Engine: {health_data.get('engine')}")
                return True
            else:
                print("✗ Dam SQS connection unhealthy")
                print(f"   Response: {health_data}")
                return False
        else:
            print(f"✗ Health check failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing dam health: {e}")
        return False


def main():
    """Main check process"""
    print("=== AWS SETUP STATUS CHECK ===")
    
    # Check AWS CLI
    if not check_aws_cli():
        print("Please install AWS CLI: pip install awscli")
        return False
    
    # Check credentials
    if not check_aws_credentials():
        print_setup_instructions()
        return False
    
    # Check SQS queue
    if not check_sqs_queue():
        print_setup_instructions()
        return False
    
    # Test dam connection
    if not test_dam_health():
        print_setup_instructions()
        return False
    
    print("\n=== ALL CHECKS PASSED ===")
    print("✓ AWS CLI available")
    print("✓ AWS credentials configured")
    print("✓ SQS queue exists")
    print("✓ Dam SQS connection healthy")
    print("Ready for testing!")
    
    return True


if __name__ == "__main__":
    success = main()
    if not success:
        print("\n" + "="*50)
        print_setup_instructions()
    sys.exit(0 if success else 1)
