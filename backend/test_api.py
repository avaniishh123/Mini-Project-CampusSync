#!/usr/bin/env python
"""
Test script for CampusConnect API
This script tests the key endpoints of the CampusConnect API
"""

import requests
import json
import os
from pprint import pprint

# Base URL for the API
BASE_URL = "http://localhost:5000/api"

# Test user credentials
TEST_USER = {
    "username": "testuser",
    "email": "testuser@college.edu",
    "password": "Test@123",
    "name": "Test User",
    "year": "3rd Year",
    "department": "Computer Science",
    "college": "Test College"
}

# Storage for auth token
AUTH_TOKEN = None

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
    
    url = f"{BASE_URL}/users/register"
    response = requests.post(url, json=TEST_USER)
    print_response(response)
    
    if response.status_code == 201:
        data = response.json()
        if 'data' in data and 'verification_code' in data['data']:
            return data['data']['verification_code'], data['data']['user_id']
    
    return None, None

def test_verify_email(verification_code, user_id):
    """Test email verification"""
    print("\n=== Testing Email Verification ===")
    
    url = f"{BASE_URL}/users/verify"
    data = {
        "email": TEST_USER["email"],
        "verification_code": verification_code
    }
    
    response = requests.post(url, json=data)
    print_response(response)
    
    if response.status_code == 200:
        data = response.json()
        if 'data' in data and 'token' in data['data']:
            return data['data']['token']
    
    return None

def test_login():
    """Test user login"""
    print("\n=== Testing User Login ===")
    
    url = f"{BASE_URL}/users/login"
    data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    
    response = requests.post(url, json=data)
    print_response(response)
    
    if response.status_code == 200:
        data = response.json()
        if 'data' in data and 'token' in data['data']:
            return data['data']['token']
    
    return None

def test_profile(token):
    """Test getting user profile"""
    print("\n=== Testing Get Profile ===")
    
    url = f"{BASE_URL}/users/profile"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print_response(response)

def test_create_post(token):
    """Test creating a post"""
    print("\n=== Testing Create Post ===")
    
    url = f"{BASE_URL}/social-feed/posts"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "title": "Test Post",
        "content": "This is a test post content.",
        "category": "general",
        "tags": ["test", "api"]
    }
    
    response = requests.post(url, json=data, headers=headers)
    print_response(response)
    
    if response.status_code == 201:
        data = response.json()
        if 'data' in data and 'post_id' in data['data']:
            return data['data']['post_id']
    
    return None

def test_get_posts(token):
    """Test getting posts"""
    print("\n=== Testing Get Posts ===")
    
    url = f"{BASE_URL}/social-feed/posts"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print_response(response)

def test_upload_resource(token):
    """Test uploading a resource"""
    print("\n=== Testing Upload Resource ===")
    
    # Create a test file
    test_file_path = "test_resource.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test resource file.")
    
    url = f"{BASE_URL}/resources/upload"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "title": "Test Resource",
        "description": "This is a test resource.",
        "subject": "Computer Science",
        "semester": "Fall 2023",
        "type": "Notes"
    }
    files = {
        "file": open(test_file_path, "rb")
    }
    
    response = requests.post(url, data=data, files=files, headers=headers)
    print_response(response)
    
    # Clean up
    files["file"].close()
    os.remove(test_file_path)
    
    if response.status_code == 201:
        data = response.json()
        if 'data' in data and 'resource_id' in data['data']:
            return data['data']['resource_id']
    
    return None

def test_get_resources(token):
    """Test getting resources"""
    print("\n=== Testing Get Resources ===")
    
    url = f"{BASE_URL}/resources"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print_response(response)

def test_create_opportunity(token):
    """Test creating an opportunity"""
    print("\n=== Testing Create Opportunity ===")
    
    url = f"{BASE_URL}/opportunities"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "title": "Test Opportunity",
        "description": "This is a test opportunity.",
        "type": "internship",
        "domain": "Software Development",
        "is_paid": True,
        "compensation": "$15/hour",
        "company": "Test Company",
        "location": "Remote",
        "remote": True,
        "skills_required": ["Python", "Flask", "MongoDB"],
        "deadline": "2023-12-31T23:59:59"
    }
    
    response = requests.post(url, json=data, headers=headers)
    print_response(response)
    
    if response.status_code == 201:
        data = response.json()
        if 'data' in data and 'opportunity_id' in data['data']:
            return data['data']['opportunity_id']
    
    return None

def test_get_opportunities(token):
    """Test getting opportunities"""
    print("\n=== Testing Get Opportunities ===")
    
    url = f"{BASE_URL}/opportunities"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print_response(response)

def test_create_study_group(token):
    """Test creating a study group"""
    print("\n=== Testing Create Study Group ===")
    
    url = f"{BASE_URL}/study-groups"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "name": "Test Study Group",
        "description": "This is a test study group for API testing.",
        "subject": "Computer Science",
        "meeting_schedule": "Every Monday at 5 PM",
        "meeting_location": "Library Room 101",
        "is_virtual": True,
        "virtual_meeting_link": "https://meet.example.com/testgroup",
        "max_members": 10,
        "is_private": False,
        "tags": ["programming", "algorithms", "data structures"]
    }
    
    response = requests.post(url, json=data, headers=headers)
    print_response(response)
    
    if response.status_code == 201:
        data = response.json()
        if 'data' in data and 'group_id' in data['data']:
            return data['data']['group_id']
    
    return None

def test_get_study_groups(token):
    """Test getting study groups"""
    print("\n=== Testing Get Study Groups ===")
    
    url = f"{BASE_URL}/study-groups"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print_response(response)

def test_get_specific_study_group(token, group_id):
    """Test getting a specific study group"""
    print("\n=== Testing Get Specific Study Group ===")
    
    url = f"{BASE_URL}/study-groups/{group_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print_response(response)

def test_leave_study_group(token, group_id):
    """Test leaving a study group"""
    print("\n=== Testing Leave Study Group ===")
    
    url = f"{BASE_URL}/study-groups/{group_id}/leave"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(url, headers=headers)
    print_response(response)

def main():
    """Main test function"""
    global AUTH_TOKEN
    
    # Test user registration and email verification
    verification_code, user_id = test_register()
    if verification_code:
        AUTH_TOKEN = test_verify_email(verification_code, user_id)
    
    # If registration/verification failed, try login
    if not AUTH_TOKEN:
        AUTH_TOKEN = test_login()
    
    # If we have a token, test other endpoints
    if AUTH_TOKEN:
        test_profile(AUTH_TOKEN)
        
        # Test social feed
        post_id = test_create_post(AUTH_TOKEN)
        test_get_posts(AUTH_TOKEN)
        
        # Test resources
        resource_id = test_upload_resource(AUTH_TOKEN)
        test_get_resources(AUTH_TOKEN)
        
        # Test opportunities
        opportunity_id = test_create_opportunity(AUTH_TOKEN)
        test_get_opportunities(AUTH_TOKEN)
        
        # Test study groups
        group_id = test_create_study_group(AUTH_TOKEN)
        test_get_study_groups(AUTH_TOKEN)
        if group_id:
            test_get_specific_study_group(AUTH_TOKEN, group_id)
            # Uncomment to test leaving the group
            # test_leave_study_group(AUTH_TOKEN, group_id)
    else:
        print("Failed to authenticate. Cannot test other endpoints.")

if __name__ == "__main__":
    main()
