"""
Simple test script for CampusConnect Social Feed API
"""
import requests
import json
import time
import logging

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

def main():
    print("\n===== TESTING SOCIAL FEED FUNCTIONALITY =====\n")
    
    # Step 1: Register a test user
    print("Step 1: Registering test user...")
    register_url = f"{BASE_URL}/users/register"
    register_response = requests.post(register_url, json=TEST_USER)
    
    if register_response.status_code != 201:
        print(f"Registration failed with status code: {register_response.status_code}")
        print(register_response.json())
        return
    
    register_data = register_response.json()
    verification_code = register_data.get('data', {}).get('verification_code')
    user_id = register_data.get('data', {}).get('user_id')
    
    print(f"User registered successfully with ID: {user_id}")
    
    # Step 2: Verify email
    print("\nStep 2: Verifying email...")
    verify_url = f"{BASE_URL}/users/verify"
    verify_data = {
        "email": TEST_USER["email"],
        "verification_code": verification_code
    }
    verify_response = requests.post(verify_url, json=verify_data)
    
    if verify_response.status_code != 200:
        print(f"Email verification failed with status code: {verify_response.status_code}")
        print(verify_response.json())
        return
    
    verify_data = verify_response.json()
    auth_token = verify_data.get('data', {}).get('token')
    
    print("Email verified successfully")
    
    # Common headers for authenticated requests
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Step 3: Create a post
    print("\nStep 3: Creating a post...")
    create_post_url = f"{BASE_URL}/social-feed/posts"
    post_data = {
        "title": f"Test Post {int(time.time())}",
        "content": "This is a test post content for testing the social feed functionality.",
        "category": "general",
        "tags": ["test", "social", "feed"]
    }
    
    create_post_response = requests.post(create_post_url, json=post_data, headers=headers)
    
    if create_post_response.status_code != 201:
        print(f"Post creation failed with status code: {create_post_response.status_code}")
        print(create_post_response.json())
        return
    
    create_post_data = create_post_response.json()
    post_id = create_post_data.get('data', {}).get('post_id')
    
    print(f"Post created successfully with ID: {post_id}")
    
    # Step 4: Get all posts
    print("\nStep 4: Getting all posts...")
    get_posts_url = f"{BASE_URL}/social-feed/posts"
    get_posts_response = requests.get(get_posts_url, headers=headers)
    
    if get_posts_response.status_code != 200:
        print(f"Getting posts failed with status code: {get_posts_response.status_code}")
        print(get_posts_response.json())
        return
    
    get_posts_data = get_posts_response.json()
    posts = get_posts_data.get('data', {}).get('posts', [])
    
    print(f"Retrieved {len(posts)} posts successfully")
    
    # Step 5: Get specific post
    print("\nStep 5: Getting specific post...")
    get_post_url = f"{BASE_URL}/social-feed/posts/{post_id}"
    get_post_response = requests.get(get_post_url, headers=headers)
    
    if get_post_response.status_code != 200:
        print(f"Getting specific post failed with status code: {get_post_response.status_code}")
        print(get_post_response.json())
        return
    
    get_post_data = get_post_response.json()
    post = get_post_data.get('data', {})
    
    print(f"Retrieved post successfully: {post.get('title')}")
    
    # Step 6: Add a comment
    print("\nStep 6: Adding a comment...")
    add_comment_url = f"{BASE_URL}/social-feed/posts/{post_id}/comments"
    comment_data = {
        "content": f"This is a test comment {int(time.time())}"
    }
    
    add_comment_response = requests.post(add_comment_url, json=comment_data, headers=headers)
    
    if add_comment_response.status_code != 201:
        print(f"Adding comment failed with status code: {add_comment_response.status_code}")
        print(add_comment_response.json())
        return
    
    add_comment_data = add_comment_response.json()
    comment_id = add_comment_data.get('data', {}).get('comment_id')
    
    print(f"Comment added successfully with ID: {comment_id}")
    
    # Step 7: Like the post
    print("\nStep 7: Liking the post...")
    like_post_url = f"{BASE_URL}/social-feed/posts/{post_id}/like"
    
    like_post_response = requests.post(like_post_url, headers=headers)
    
    if like_post_response.status_code != 200:
        print(f"Liking post failed with status code: {like_post_response.status_code}")
        print(like_post_response.json())
        return
    
    like_post_data = like_post_response.json()
    likes_count = like_post_data.get('data', {}).get('likes_count')
    
    print(f"Post liked successfully. Likes count: {likes_count}")
    
    # Step 8: Like the comment
    print("\nStep 8: Liking the comment...")
    like_comment_url = f"{BASE_URL}/social-feed/comments/{comment_id}/like"
    
    like_comment_response = requests.post(like_comment_url, headers=headers)
    
    if like_comment_response.status_code != 200:
        print(f"Liking comment failed with status code: {like_comment_response.status_code}")
        print(like_comment_response.json())
        return
    
    like_comment_data = like_comment_response.json()
    comment_likes_count = like_comment_data.get('data', {}).get('likes_count')
    
    print(f"Comment liked successfully. Likes count: {comment_likes_count}")
    
    # Step 9: Update the post
    print("\nStep 9: Updating the post...")
    update_post_url = f"{BASE_URL}/social-feed/posts/{post_id}"
    update_post_data = {
        "title": f"Updated Test Post {int(time.time())}",
        "content": "This is an updated test post content.",
        "category": "announcement",
        "tags": ["updated", "test", "social"]
    }
    
    update_post_response = requests.put(update_post_url, json=update_post_data, headers=headers)
    
    if update_post_response.status_code != 200:
        print(f"Updating post failed with status code: {update_post_response.status_code}")
        print(update_post_response.json())
        return
    
    print("Post updated successfully")
    
    # Step 10: Delete the post
    print("\nStep 10: Deleting the post...")
    delete_post_url = f"{BASE_URL}/social-feed/posts/{post_id}"
    
    delete_post_response = requests.delete(delete_post_url, headers=headers)
    
    if delete_post_response.status_code != 200:
        print(f"Deleting post failed with status code: {delete_post_response.status_code}")
        print(delete_post_response.json())
        return
    
    print("Post deleted successfully")
    
    print("\n===== SOCIAL FEED FUNCTIONALITY TEST COMPLETED SUCCESSFULLY =====")
    print("All social feed endpoints are working correctly!")

if __name__ == "__main__":
    main()
