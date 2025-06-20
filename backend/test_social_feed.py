"""
Test script for CampusConnect Social Feed API
This script tests all social feed endpoints to ensure they're working correctly
"""

import requests
import json
import time
import logging
import traceback
from pprint import pprint

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for the API
BASE_URL = "http://localhost:5000/api"

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

# Storage for auth token and IDs
AUTH_TOKEN = None
USER_ID = None
POST_ID = None
COMMENT_ID = None

def print_response(response, title=None):
    """Print response details"""
    if title:
        print(f"\n=== {title} ===")
    
    print(f"Status Code: {response.status_code}")
    print(f"URL: {response.url}")
    
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

def register_and_login():
    """Register a test user and login to get auth token"""
    global AUTH_TOKEN, USER_ID
    
    try:
        # Register user
        print("\n=== Registering Test User ===")
        register_url = f"{BASE_URL}/users/register"
        register_response = requests.post(register_url, json=TEST_USER)
        register_data = print_response(register_response)
        
        if register_response.status_code == 201 and register_data and register_data.get('status') == 'success':
            verification_code = register_data.get('data', {}).get('verification_code')
            user_id = register_data.get('data', {}).get('user_id')
            USER_ID = user_id
            
            # Verify email
            print("\n=== Verifying Email ===")
            verify_url = f"{BASE_URL}/users/verify"
            verify_data = {
                "email": TEST_USER["email"],
                "verification_code": verification_code
            }
            verify_response = requests.post(verify_url, json=verify_data)
            verify_data = print_response(verify_response)
            
            if verify_response.status_code == 200 and verify_data and verify_data.get('status') == 'success':
                AUTH_TOKEN = verify_data.get('data', {}).get('token')
                return True
        
        # If registration/verification failed, try login
        print("\n=== Login as Test User ===")
        login_url = f"{BASE_URL}/users/login"
        login_data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        login_response = requests.post(login_url, json=login_data)
        login_data = print_response(login_response)
        
        if login_response.status_code == 200 and login_data and login_data.get('status') == 'success':
            AUTH_TOKEN = login_data.get('data', {}).get('token')
            USER_ID = login_data.get('data', {}).get('user', {}).get('id')
            return True
        
        return False
    
    except Exception as e:
        logger.error(f"Error in register_and_login: {str(e)}")
        traceback.print_exc()
        return False

def test_create_post():
    """Test creating a post"""
    global POST_ID
    
    try:
        print("\n=== Testing Create Post ===")
        
        if not AUTH_TOKEN:
            print("Cannot create post: Not authenticated")
            return False
        
        url = f"{BASE_URL}/social-feed/posts"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        data = {
            "title": f"Test Post {int(time.time())}",
            "content": "This is a test post content for testing the social feed functionality.",
            "category": "general",
            "tags": ["test", "social", "feed"]
        }
        
        response = requests.post(url, json=data, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 201 and resp_data and resp_data.get('status') == 'success':
            POST_ID = resp_data.get('data', {}).get('post_id')
            print(f"Post created successfully. Post ID: {POST_ID}")
            return True
        else:
            print("Failed to create post")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_create_post: {str(e)}")
        traceback.print_exc()
        return False

def test_get_posts():
    """Test getting posts"""
    try:
        print("\n=== Testing Get Posts ===")
        
        if not AUTH_TOKEN:
            print("Cannot get posts: Not authenticated")
            return False
        
        url = f"{BASE_URL}/social-feed/posts"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.get(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            posts = resp_data.get('data', {}).get('posts', [])
            print(f"Retrieved {len(posts)} posts successfully")
            return True
        else:
            print("Failed to get posts")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_get_posts: {str(e)}")
        traceback.print_exc()
        return False

def test_get_specific_post():
    """Test getting a specific post"""
    try:
        print("\n=== Testing Get Specific Post ===")
        
        if not AUTH_TOKEN or not POST_ID:
            print("Cannot get specific post: Not authenticated or no post created")
            return False
        
        url = f"{BASE_URL}/social-feed/posts/{POST_ID}"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.get(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            post = resp_data.get('data', {})
            print(f"Retrieved post successfully: {post.get('title')}")
            return True
        else:
            print("Failed to get specific post")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_get_specific_post: {str(e)}")
        traceback.print_exc()
        return False

def test_update_post():
    """Test updating a post"""
    try:
        print("\n=== Testing Update Post ===")
        
        if not AUTH_TOKEN or not POST_ID:
            print("Cannot update post: Not authenticated or no post created")
            return False
        
        url = f"{BASE_URL}/social-feed/posts/{POST_ID}"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        data = {
            "title": f"Updated Test Post {int(time.time())}",
            "content": "This is an updated test post content.",
            "category": "announcement",
            "tags": ["updated", "test", "social"]
        }
        
        response = requests.put(url, json=data, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            print("Post updated successfully")
            return True
        else:
            print("Failed to update post")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_update_post: {str(e)}")
        traceback.print_exc()
        return False

def test_add_comment():
    """Test adding a comment to a post"""
    global COMMENT_ID
    
    try:
        print("\n=== Testing Add Comment ===")
        
        if not AUTH_TOKEN or not POST_ID:
            print("Cannot add comment: Not authenticated or no post created")
            return False
        
        url = f"{BASE_URL}/social-feed/posts/{POST_ID}/comments"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        data = {
            "content": f"This is a test comment {int(time.time())}"
        }
        
        response = requests.post(url, json=data, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 201 and resp_data and resp_data.get('status') == 'success':
            COMMENT_ID = resp_data.get('data', {}).get('comment_id')
            print(f"Comment added successfully. Comment ID: {COMMENT_ID}")
            return True
        else:
            print("Failed to add comment")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_add_comment: {str(e)}")
        traceback.print_exc()
        return False

def test_like_post():
    """Test liking a post"""
    try:
        print("\n=== Testing Like Post ===")
        
        if not AUTH_TOKEN or not POST_ID:
            print("Cannot like post: Not authenticated or no post created")
            return False
        
        url = f"{BASE_URL}/social-feed/posts/{POST_ID}/like"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.post(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            likes_count = resp_data.get('data', {}).get('likes_count')
            print(f"Post liked successfully. Likes count: {likes_count}")
            return True
        else:
            print("Failed to like post")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_like_post: {str(e)}")
        traceback.print_exc()
        return False

def test_like_comment():
    """Test liking a comment"""
    try:
        print("\n=== Testing Like Comment ===")
        
        if not AUTH_TOKEN or not COMMENT_ID:
            print("Cannot like comment: Not authenticated or no comment created")
            return False
        
        url = f"{BASE_URL}/social-feed/comments/{COMMENT_ID}/like"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.post(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            likes_count = resp_data.get('data', {}).get('likes_count')
            print(f"Comment liked successfully. Likes count: {likes_count}")
            return True
        else:
            print("Failed to like comment")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_like_comment: {str(e)}")
        traceback.print_exc()
        return False

def test_delete_post():
    """Test deleting a post"""
    try:
        print("\n=== Testing Delete Post ===")
        
        if not AUTH_TOKEN or not POST_ID:
            print("Cannot delete post: Not authenticated or no post created")
            return False
        
        url = f"{BASE_URL}/social-feed/posts/{POST_ID}"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.delete(url, headers=headers)
        resp_data = print_response(response)
        
        if response.status_code == 200 and resp_data and resp_data.get('status') == 'success':
            print("Post deleted successfully")
            return True
        else:
            print("Failed to delete post")
            return False
    
    except Exception as e:
        logger.error(f"Error in test_delete_post: {str(e)}")
        traceback.print_exc()
        return False

def main():
    """Main function to test social feed functionality"""
    try:
        print("\n" + "=" * 80)
        print("TESTING CAMPUSCONNECT SOCIAL FEED FUNCTIONALITY")
        print("=" * 80 + "\n")
        
        # Register and login
        if not register_and_login():
            print("Failed to authenticate. Cannot test social feed functionality.")
            return
        
        # Test social feed functionality
        tests = [
            ("Create Post", test_create_post),
            ("Get Posts", test_get_posts),
            ("Get Specific Post", test_get_specific_post),
            ("Update Post", test_update_post),
            ("Add Comment", test_add_comment),
            ("Like Post", test_like_post),
            ("Like Comment", test_like_comment),
            ("Delete Post", test_delete_post)
        ]
        
        results = {}
        all_passed = True
        
        for test_name, test_func in tests:
            print("\n" + "-" * 80)
            print(f"RUNNING TEST: {test_name}")
            print("-" * 80)
            
            result = test_func()
            results[test_name] = "PASSED" if result else "FAILED"
            
            if not result:
                all_passed = False
        
        # Print test results
        print("\n" + "=" * 80)
        print("SOCIAL FEED FUNCTIONALITY TEST RESULTS")
        print("=" * 80)
        
        for test_name, result in results.items():
            print(f"{test_name:25}: {result}")
        
        print("\n" + "=" * 80)
        if all_passed:
            print("ALL SOCIAL FEED TESTS PASSED! The social feed functionality is working correctly.")
        else:
            print("SOME SOCIAL FEED TESTS FAILED. Please check the logs for details.")
        print("=" * 80 + "\n")
    
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
