"""
Debug script for CampusConnect API
This script tests the user registration and login endpoints with detailed error handling
"""

import requests
import json
import os
from pprint import pprint
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for the API
BASE_URL = "http://localhost:5000/api"

# Test user credentials
TEST_USER = {
    "username": "testuser2",
    "email": "testuser2@college.edu",
    "password": "Test@123",
    "name": "Test User",
    "year": "3rd Year",
    "department": "Computer Science",
    "college": "Test College"
}

def print_response(response):
    """Print response details"""
    print(f"Status Code: {response.status_code}")
    print(f"URL: {response.url}")
    print(f"Headers: {dict(response.headers)}")
    try:
        pprint(response.json())
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        print(f"Raw response: {response.text}")
    print("-" * 50)

def test_register():
    """Test user registration"""
    print("\n=== Testing User Registration ===")
    
    try:
        url = f"{BASE_URL}/users/register"
        print(f"Sending POST request to: {url}")
        print(f"Request data: {json.dumps(TEST_USER, indent=2)}")
        
        response = requests.post(url, json=TEST_USER)
        print_response(response)
        
        if response.status_code == 201:
            data = response.json()
            if 'data' in data and 'verification_code' in data['data']:
                return data['data']['verification_code'], data['data']['user_id']
    
    except Exception as e:
        logger.error(f"Exception in test_register: {str(e)}")
        traceback.print_exc()
    
    return None, None

def test_login():
    """Test user login"""
    print("\n=== Testing User Login ===")
    
    try:
        url = f"{BASE_URL}/users/login"
        data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        
        print(f"Sending POST request to: {url}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data)
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and 'token' in data['data']:
                return data['data']['token']
    
    except Exception as e:
        logger.error(f"Exception in test_login: {str(e)}")
        traceback.print_exc()
    
    return None

def main():
    """Main test function"""
    try:
        # Test user registration
        verification_code, user_id = test_register()
        
        # Test user login
        token = test_login()
        
        if token:
            print("\n=== Authentication Successful ===")
            print(f"Token: {token}")
        else:
            print("\n=== Authentication Failed ===")
    
    except Exception as e:
        logger.error(f"Exception in main: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
