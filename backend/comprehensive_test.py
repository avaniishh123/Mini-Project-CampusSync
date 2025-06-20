"""
Comprehensive Test Script for CampusConnect API
This script tests all major endpoints of the CampusConnect API
"""

import requests
import json
import os
import time
import random
import string
from pprint import pprint
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for the API
BASE_URL = "http://localhost:5000"

# Test user credentials
TEST_USER = {
    "username": f"testuser_{int(time.time())}",
    "email": f"testuser_{int(time.time())}@college.edu",
    "password": "Test@123",
    "name": "Test User",
    "year": "3rd Year",
    "department": "Computer Science",
    "college": "Test College"
}

# Storage for auth token and user ID
AUTH_TOKEN = None
USER_ID = None
POST_ID = None
RESOURCE_ID = None
OPPORTUNITY_ID = None
STUDY_GROUP_ID = None

def print_response(response, title=None):
    """Print response details"""
    if title:
        print(f"\n=== {title} ===")
    
    print(f"Status Code: {response.status_code}")
    print(f"URL: {response.url}")
    print(f"Headers: {dict(response.headers)}")
    
    try:
        data = response.json()
        pprint(data)
        return data
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        print(f"Raw response: {response.text}")
        return None
    finally:
        print("-" * 50)

def test_register():
    """Test user registration"""
    print("\n=== Testing User Registration ===")
    
    try:
        url = f"{BASE_URL}/api/users/register"
        print(f"Sending POST request to: {url}")
        print(f"Request data: {json.dumps(TEST_USER, indent=2)}")
        
        response = requests.post(url, json=TEST_USER)
        data = print_response(response)
        
        if response.status_code == 201 and data and data.get('status') == 'success':
            verification_code = data.get('data', {}).get('verification_code')
            user_id = data.get('data', {}).get('user_id')
            print(f"Registration successful. Verification code: {verification_code}, User ID: {user_id}")
            return verification_code, user_id
        else:
            print("Registration failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_register: {str(e)}")
        traceback.print_exc()
    
    return None, None

def test_verify_email(verification_code, user_id):
    """Test email verification"""
    print("\n=== Testing Email Verification ===")
    
    try:
        if not verification_code or not user_id:
            print("Cannot verify email: Missing verification code or user ID.")
            return None
        
        url = f"{BASE_URL}/api/users/verify"
        data = {
            "email": TEST_USER["email"],
            "verification_code": verification_code
        }
        
        print(f"Sending POST request to: {url}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            token = resp_data.get('data', {}).get('token')
            print(f"Email verification successful. Token: {token}")
            return token
        else:
            print("Email verification failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_verify_email: {str(e)}")
        traceback.print_exc()
    
    return None

def test_login():
    """Test user login"""
    print("\n=== Testing User Login ===")
    
    try:
        url = f"{BASE_URL}/api/users/login"
        data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        
        print(f"Sending POST request to: {url}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            token = resp_data.get('data', {}).get('token')
            print(f"Login successful. Token: {token}")
            return token
        else:
            print("Login failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_login: {str(e)}")
        traceback.print_exc()
    
    return None

def test_profile(token):
    """Test getting user profile"""
    print("\n=== Testing Get Profile ===")
    
    try:
        if not token:
            print("Cannot get profile: Missing auth token.")
            return
        
        url = f"{BASE_URL}/api/users/profile"
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"Sending GET request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        
        response = requests.get(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            print("Profile retrieval successful.")
        else:
            print("Profile retrieval failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_profile: {str(e)}")
        traceback.print_exc()

def test_create_post(token):
    """Test creating a post"""
    print("\n=== Testing Create Post ===")
    
    try:
        if not token:
            print("Cannot create post: Missing auth token.")
            return None
        
        url = f"{BASE_URL}/api/social-feed/posts"
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "title": f"Test Post {int(time.time())}",
            "content": "This is a test post content created by the comprehensive test script.",
            "category": "general",
            "tags": ["test", "api", "automated"]
        }
        
        print(f"Sending POST request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 201 and resp_data and resp_data.get('status') == 'success':
            post_id = resp_data.get('data', {}).get('post_id')
            print(f"Post creation successful. Post ID: {post_id}")
            return post_id
        else:
            print("Post creation failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_create_post: {str(e)}")
        traceback.print_exc()
    
    return None

def test_get_posts(token):
    """Test getting posts"""
    print("\n=== Testing Get Posts ===")
    
    try:
        if not token:
            print("Cannot get posts: Missing auth token.")
            return
        
        url = f"{BASE_URL}/api/social-feed/posts"
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"Sending GET request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        
        response = requests.get(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            print("Posts retrieval successful.")
        else:
            print("Posts retrieval failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_get_posts: {str(e)}")
        traceback.print_exc()

def test_create_study_group(token):
    """Test creating a study group"""
    print("\n=== Testing Create Study Group ===")
    
    try:
        if not token:
            print("Cannot create study group: Missing auth token.")
            return None
        
        url = f"{BASE_URL}/api/study-groups"
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "name": f"Test Study Group {int(time.time())}",
            "description": "This is a test study group created by the comprehensive test script.",
            "subject": "Computer Science",
            "meeting_schedule": "Every Monday at 5 PM",
            "meeting_location": "Library Room 101",
            "is_virtual": True,
            "virtual_meeting_link": "https://meet.example.com/testgroup",
            "max_members": 10,
            "is_private": False,
            "tags": ["programming", "algorithms", "data structures"]
        }
        
        print(f"Sending POST request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 201 and resp_data and resp_data.get('status') == 'success':
            group_id = resp_data.get('data', {}).get('group_id')
            print(f"Study group creation successful. Group ID: {group_id}")
            return group_id
        else:
            print("Study group creation failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_create_study_group: {str(e)}")
        traceback.print_exc()
    
    return None

def test_get_study_groups(token):
    """Test getting study groups"""
    print("\n=== Testing Get Study Groups ===")
    
    try:
        if not token:
            print("Cannot get study groups: Missing auth token.")
            return
        
        url = f"{BASE_URL}/api/study-groups"
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"Sending GET request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        
        response = requests.get(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            print("Study groups retrieval successful.")
        else:
            print("Study groups retrieval failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_get_study_groups: {str(e)}")
        traceback.print_exc()

def test_create_opportunity(token):
    """Test creating an opportunity"""
    print("\n=== Testing Create Opportunity ===")
    
    try:
        if not token:
            print("Cannot create opportunity: Missing auth token.")
            return None
        
        url = f"{BASE_URL}/api/opportunities"
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "title": f"Test Opportunity {int(time.time())}",
            "description": "This is a test opportunity created by the comprehensive test script.",
            "type": "internship",
            "domain": "Software Development",
            "is_paid": True,
            "compensation": "$15/hour",
            "company": "Test Company",
            "location": "Remote",
            "remote": True,
            "skills_required": ["Python", "Flask", "MongoDB"],
            "deadline": "2025-12-31T23:59:59"
        }
        
        print(f"Sending POST request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 201 and resp_data and resp_data.get('status') == 'success':
            opportunity_id = resp_data.get('data', {}).get('opportunity_id')
            print(f"Opportunity creation successful. Opportunity ID: {opportunity_id}")
            return opportunity_id
        else:
            print("Opportunity creation failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_create_opportunity: {str(e)}")
        traceback.print_exc()
    
    return None

def test_get_opportunities(token):
    """Test getting opportunities"""
    print("\n=== Testing Get Opportunities ===")
    
    try:
        if not token:
            print("Cannot get opportunities: Missing auth token.")
            return
        
        url = f"{BASE_URL}/api/opportunities"
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"Sending GET request to: {url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        
        response = requests.get(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            print("Opportunities retrieval successful.")
        else:
            print("Opportunities retrieval failed.")
    
    except Exception as e:
        logger.error(f"Exception in test_get_opportunities: {str(e)}")
        traceback.print_exc()

def main():
    """Main test function"""
    global AUTH_TOKEN, USER_ID, POST_ID, RESOURCE_ID, OPPORTUNITY_ID, STUDY_GROUP_ID
    
    try:
        print("\n" + "=" * 80)
        print("STARTING COMPREHENSIVE TEST OF CAMPUSCONNECT API")
        print("=" * 80 + "\n")
        
        # Test user registration and email verification
        verification_code, user_id = test_register()
        USER_ID = user_id
        
        if verification_code and user_id:
            AUTH_TOKEN = test_verify_email(verification_code, user_id)
        
        # If registration/verification failed, try login
        if not AUTH_TOKEN:
            AUTH_TOKEN = test_login()
        
        # If we have a token, test other endpoints
        if AUTH_TOKEN:
            print("\n" + "=" * 80)
            print("AUTHENTICATION SUCCESSFUL - TESTING ENDPOINTS")
            print("=" * 80 + "\n")
            
            # Test user profile
            test_profile(AUTH_TOKEN)
            
            # Test social feed
            POST_ID = test_create_post(AUTH_TOKEN)
            test_get_posts(AUTH_TOKEN)
            
            # Test study groups
            STUDY_GROUP_ID = test_create_study_group(AUTH_TOKEN)
            test_get_study_groups(AUTH_TOKEN)
            
            # Test opportunities
            OPPORTUNITY_ID = test_create_opportunity(AUTH_TOKEN)
            test_get_opportunities(AUTH_TOKEN)
            
            print("\n" + "=" * 80)
            print("COMPREHENSIVE TEST COMPLETED SUCCESSFULLY")
            print("=" * 80 + "\n")
        else:
            print("\n" + "=" * 80)
            print("AUTHENTICATION FAILED - CANNOT TEST OTHER ENDPOINTS")
            print("=" * 80 + "\n")
    
    except Exception as e:
        logger.error(f"Exception in main: {str(e)}")
        traceback.print_exc()
        
        print("\n" + "=" * 80)
        print(f"COMPREHENSIVE TEST FAILED: {str(e)}")
        print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
