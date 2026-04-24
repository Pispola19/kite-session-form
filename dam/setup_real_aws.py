#!/usr/bin/env python3
"""
Real AWS Setup Script

This script helps set up real AWS credentials and SQS queue for the dam system.
"""

import os
import subprocess
import sys
from pathlib import Path


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


def setup_aws_credentials():
    """Guide user through AWS credentials setup"""
    print("\n=== AWS CREDENTIALS SETUP ===")
    print("Choose setup method:")
    print("1. AWS CLI (recommended)")
    print("2. Environment variables")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == "1":
        print("\nSetting up AWS CLI credentials...")
        print("Run this command:")
        print("aws configure")
        print("\nThen enter your credentials when prompted:")
        print("- AWS Access Key ID: [YOUR_ACCESS_KEY]")
        print("- AWS Secret Access Key: [YOUR_SECRET_KEY]")
        print("- Default region name: us-east-1")
        print("- Default output format: json")
        
        input("\nPress Enter after running aws configure...")
        return check_aws_credentials()
    
    elif choice == "2":
        print("\nSetting up environment variables...")
        print("Add these to your shell profile or set temporarily:")
        print("export AWS_ACCESS_KEY_ID=your_access_key_here")
        print("export AWS_SECRET_ACCESS_KEY=your_secret_key_here")
        print("export AWS_DEFAULT_REGION=us-east-1")
        
        access_key = input("\nEnter your AWS Access Key ID: ").strip()
        secret_key = input("Enter your AWS Secret Access Key: ").strip()
        
        if access_key and secret_key:
            os.environ['AWS_ACCESS_KEY_ID'] = access_key
            os.environ['AWS_SECRET_ACCESS_KEY'] = secret_key
            os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
            print("✓ Environment variables set")
            return check_aws_credentials()
        else:
            print("✗ Invalid credentials")
            return False
    
    else:
        print("✗ Invalid choice")
        return False


def check_or_create_sqs_queue():
    """Check if SQS queue exists, create if needed"""
    queue_name = "kite-sessions-dam.fifo"
    region = "us-east-1"
    
    print(f"\n=== SQS QUEUE SETUP ===")
    print(f"Checking queue: {queue_name}")
    
    # Check if queue exists
    try:
        result = subprocess.run([
            'aws', 'sqs', 'get-queue-url',
            '--queue-name', queue_name,
            '--region', region
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Queue exists: {result.stdout.strip()}")
            return True
        else:
            print(f"Queue not found, creating...")
            
    except Exception as e:
        print(f"Error checking queue: {e}")
    
    # Create queue
    try:
        result = subprocess.run([
            'aws', 'sqs', 'create-queue',
            '--queue-name', queue_name,
            '--region', region,
            '--attributes',
            'FifoQueue=true',
            'ContentBasedDeduplication=true',
            'MessageRetentionPeriod=1209600'  # 14 days
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Queue created successfully")
            print(f"   {result.stdout.strip()}")
            
            # Extract queue URL
            queue_url = None
            for line in result.stdout.strip().split('\n'):
                if 'QueueUrl' in line:
                    queue_url = line.split('"')[1]
                    break
            
            if queue_url:
                print(f"   Queue URL: {queue_url}")
                return queue_url
            else:
                print("✗ Could not extract queue URL")
                return None
        else:
            print(f"✗ Failed to create queue")
            print(f"   Error: {result.stderr.strip()}")
            return None
            
    except Exception as e:
        print(f"✗ Error creating queue: {e}")
        return None


def update_env_file(queue_url):
    """Update .env file with real queue URL"""
    env_file = Path(__file__).parent / '.env'
    
    print(f"\n=== UPDATING .env FILE ===")
    
    try:
        # Read current .env
        if env_file.exists():
            with open(env_file, 'r') as f:
                lines = f.readlines()
        else:
            lines = []
        
        # Update or add queue URL
        updated = False
        for i, line in enumerate(lines):
            if line.startswith('DAM_SQS_QUEUE_URL='):
                lines[i] = f'DAM_SQS_QUEUE_URL={queue_url}\n'
                updated = True
                break
        
        if not updated:
            lines.append(f'DAM_SQS_QUEUE_URL={queue_url}\n')
        
        # Write back
        with open(env_file, 'w') as f:
            f.writelines(lines)
        
        print(f"✓ Updated {env_file}")
        print(f"   Queue URL: {queue_url}")
        return True
        
    except Exception as e:
        print(f"✗ Error updating .env file: {e}")
        return False


def test_dam_connection():
    """Test dam connection to real SQS"""
    print(f"\n=== TESTING DAM CONNECTION ===")
    
    try:
        # Restart dam ingest to pick up new credentials
        print("Restarting dam ingest...")
        subprocess.run(['pkill', '-f', 'dam_ingest.py'], capture_output=True)
        
        import time
        time.sleep(2)
        
        # Start dam ingest
        subprocess.Popen([
            'python3', 'dam_ingest.py'
        ], cwd=Path(__file__).parent)
        
        time.sleep(3)
        
        # Test health endpoint
        import requests
        response = requests.get('http://localhost:8081/dam/health', timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            if health_data.get('healthy'):
                print("✓ Dam SQS connection successful")
                print(f"   Engine: {health_data.get('engine')}")
                return True
            else:
                print("✗ Dam SQS connection failed")
                print(f"   Response: {health_data}")
                return False
        else:
            print(f"✗ Health check failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing dam connection: {e}")
        return False


def main():
    """Main setup process"""
    print("=== REAL AWS SETUP FOR DAM SYSTEM ===")
    
    # Step 1: Check AWS CLI
    if not check_aws_cli():
        print("Please install AWS CLI first:")
        print("pip install awscli")
        return False
    
    # Step 2: Setup credentials
    if not check_aws_credentials():
        if not setup_aws_credentials():
            print("Failed to setup AWS credentials")
            return False
    
    # Step 3: Setup SQS queue
    queue_url = check_or_create_sqs_queue()
    if not queue_url:
        print("Failed to setup SQS queue")
        return False
    
    # Step 4: Update .env file
    if not update_env_file(queue_url):
        print("Failed to update .env file")
        return False
    
    # Step 5: Test connection
    if not test_dam_connection():
        print("Failed to test dam connection")
        return False
    
    print("\n=== SETUP COMPLETE ===")
    print("✓ AWS credentials configured")
    print("✓ SQS queue created/verified")
    print("✓ Dam system connected to real SQS")
    print("✓ Ready for testing")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
