c#!/usr/bin/env python3
"""
Test script for forgot password functionality
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_forgot_password_flow():
    """Test the complete forgot password flow"""
    
    # Test data
    test_email = "test@example.com"
    test_security_question = "What is your favorite color?"
    test_security_answer = "blue"
    test_new_password = "newpassword123"
    
    print("🧪 Testing Forgot Password Functionality")
    print("=" * 50)
    
    # Step 1: Register a user with security question
    print("\n1. Registering user with security question...")
    register_data = {
        "username": "testuser",
        "email": test_email,
        "password": "oldpassword123",
        "name": "Test User",
        "year": "2025",
        "department": "Computer Science",
        "college": "Test University",
        "security_question": test_security_question,
        "security_answer": test_security_answer
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/register", json=register_data)
        print(f"   Register response: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ User registered successfully")
        else:
            print(f"   ❌ Registration failed: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Registration error: {e}")
        return
    
    # Step 2: Initiate forgot password
    print("\n2. Initiating forgot password...")
    try:
        response = requests.post(f"{BASE_URL}/users/forgot-password/initiate", 
                               json={"email": test_email})
        print(f"   Initiate response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('data', {}).get('security_question'):
                print("   ✅ Security question retrieved successfully")
                print(f"   Question: {data['data']['security_question']}")
            else:
                print("   ❌ Failed to get security question")
                return
        else:
            print(f"   ❌ Initiate failed: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Initiate error: {e}")
        return
    
    # Step 3: Verify security answer
    print("\n3. Verifying security answer...")
    try:
        response = requests.post(f"{BASE_URL}/users/forgot-password/verify", 
                               json={"email": test_email, "security_answer": test_security_answer})
        print(f"   Verify response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('data', {}).get('reset_token'):
                print("   ✅ Security answer verified successfully")
                reset_token = data['data']['reset_token']
            else:
                print("   ❌ Failed to verify security answer")
                return
        else:
            print(f"   ❌ Verify failed: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Verify error: {e}")
        return
    
    # Step 4: Reset password
    print("\n4. Resetting password...")
    try:
        response = requests.post(f"{BASE_URL}/users/forgot-password/reset", 
                               json={"reset_token": reset_token, "new_password": test_new_password})
        print(f"   Reset response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                print("   ✅ Password reset successfully")
            else:
                print("   ❌ Failed to reset password")
                return
        else:
            print(f"   ❌ Reset failed: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Reset error: {e}")
        return
    
    # Step 5: Test login with new password
    print("\n5. Testing login with new password...")
    try:
        response = requests.post(f"{BASE_URL}/users/login", 
                               json={"username": test_email, "password": test_new_password})
        print(f"   Login response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('data', {}).get('token'):
                print("   ✅ Login with new password successful")
            else:
                print("   ❌ Login with new password failed")
        else:
            print(f"   ❌ Login failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Login error: {e}")
    
    # Step 6: Test rate limiting
    print("\n6. Testing rate limiting...")
    try:
        # Try to verify wrong answer multiple times
        for i in range(6):
            response = requests.post(f"{BASE_URL}/users/forgot-password/verify", 
                                   json={"email": test_email, "security_answer": "wrong_answer"})
            print(f"   Attempt {i+1}: {response.status_code}")
            
            if response.status_code == 429:
                print("   ✅ Rate limiting working correctly")
                break
            elif i == 5:
                print("   ⚠️ Rate limiting not triggered after 6 attempts")
    except Exception as e:
        print(f"   ❌ Rate limiting test error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Forgot password functionality test completed!")

if __name__ == "__main__":
    test_forgot_password_flow() 