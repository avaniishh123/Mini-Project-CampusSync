"""
Simple API Test Script for CampusConnect API
This script tests basic API endpoints
"""

import requests
import json

# Base URL for the API
BASE_URL = "http://localhost:5000"

def test_root_endpoint():
    """Test the root endpoint"""
    print("\n=== Testing Root Endpoint ===")
    url = f"{BASE_URL}/"
    print(f"Sending GET request to: {url}")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Response JSON:")
            print(json.dumps(response.json(), indent=2))
            print("Root endpoint accessible!")
            return True
        else:
            print(f"Failed to access root endpoint: {response.text}")
            return False
    except Exception as e:
        print(f"Error accessing root endpoint: {str(e)}")
        return False

def test_users_register():
    """Test the users register endpoint"""
    print("\n=== Testing Users Register Endpoint ===")
    url = f"{BASE_URL}/api/users/register"
    print(f"Sending OPTIONS request to: {url}")
    
    try:
        # First send an OPTIONS request to check if the endpoint exists
        response = requests.options(url)
        print(f"OPTIONS Status Code: {response.status_code}")
        print(f"OPTIONS Headers: {dict(response.headers)}")
        
        # Now try a GET request
        print(f"Sending GET request to: {url}")
        response = requests.get(url)
        print(f"GET Status Code: {response.status_code}")
        
        if response.status_code != 404:
            print("Response:")
            print(response.text)
            print("Users register endpoint exists!")
            return True
        else:
            print(f"Users register endpoint not found: {response.text}")
            return False
    except Exception as e:
        print(f"Error accessing users register endpoint: {str(e)}")
        return False

def main():
    """Main function"""
    print("\n" + "=" * 80)
    print("SIMPLE API TEST FOR CAMPUSCONNECT")
    print("=" * 80 + "\n")
    
    # Test root endpoint
    root_accessible = test_root_endpoint()
    
    # Test users register endpoint
    users_register_accessible = test_users_register()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Root endpoint accessible: {root_accessible}")
    print(f"Users register endpoint accessible: {users_register_accessible}")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
