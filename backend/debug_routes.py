"""
Debug Routes Script for CampusConnect API
This script will help diagnose issues with the API routes
"""

from app import create_app
import json
import requests

def print_all_routes():
    """Print all routes in the application with their methods and full URLs"""
    app = create_app()
    
    print("\n" + "=" * 80)
    print("CAMPUSCONNECT API ROUTES (DETAILED)")
    print("=" * 80 + "\n")
    
    # Group routes by blueprint
    routes_by_blueprint = {}
    
    with app.app_context():
        for rule in app.url_map.iter_rules():
            # Skip static routes
            if "static" in rule.endpoint:
                continue
            
            # Get blueprint name
            blueprint = rule.endpoint.split('.')[0] if '.' in rule.endpoint else "root"
            
            if blueprint not in routes_by_blueprint:
                routes_by_blueprint[blueprint] = []
            
            # Add route details
            routes_by_blueprint[blueprint].append({
                "route": rule.rule,
                "methods": [method for method in rule.methods if method not in ['HEAD', 'OPTIONS']],
                "endpoint": rule.endpoint,
                "full_url": f"http://localhost:5000{rule.rule}"
            })
    
    # Print routes by blueprint
    total_routes = 0
    
    for blueprint, routes in sorted(routes_by_blueprint.items()):
        print(f"\n## {blueprint.upper()} ROUTES")
        print("-" * 80)
        
        for route in sorted(routes, key=lambda x: x["route"]):
            methods = ", ".join(route["methods"])
            print(f"{methods:20} {route['full_url']}")
            total_routes += 1
        
        print("-" * 80)
    
    print(f"\nTotal routes: {total_routes}")
    print("\n" + "=" * 80)
    
    # Save routes to JSON file
    with open("api_routes_detailed.json", "w") as f:
        json.dump(routes_by_blueprint, f, indent=2)
        
    print(f"Routes saved to api_routes_detailed.json")
    print("=" * 80 + "\n")

def test_routes():
    """Test a few key routes to see if they're accessible"""
    print("\n" + "=" * 80)
    print("TESTING KEY ROUTES")
    print("=" * 80 + "\n")
    
    # Routes to test
    routes = [
        {"url": "http://localhost:5000/", "method": "GET", "name": "Root endpoint"},
        {"url": "http://localhost:5000/api/users/register", "method": "OPTIONS", "name": "Users register endpoint (OPTIONS)"},
        {"url": "http://localhost:5000/users/register", "method": "OPTIONS", "name": "Users register endpoint without /api (OPTIONS)"},
        {"url": "http://localhost:5000/api/users/login", "method": "OPTIONS", "name": "Users login endpoint (OPTIONS)"},
        {"url": "http://localhost:5000/users/login", "method": "OPTIONS", "name": "Users login endpoint without /api (OPTIONS)"}
    ]
    
    results = []
    
    for route in routes:
        print(f"Testing {route['name']}: {route['method']} {route['url']}")
        
        try:
            if route["method"] == "GET":
                response = requests.get(route["url"])
            elif route["method"] == "OPTIONS":
                response = requests.options(route["url"])
            
            print(f"Status Code: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                if "application/json" in response.headers.get("Content-Type", ""):
                    print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
                else:
                    print(f"Response Text: {response.text[:100]}...")
                
                results.append({"route": route["name"], "accessible": True})
            else:
                print(f"Response: {response.text}")
                results.append({"route": route["name"], "accessible": False})
        
        except Exception as e:
            print(f"Error: {str(e)}")
            results.append({"route": route["name"], "accessible": False, "error": str(e)})
        
        print("-" * 80)
    
    # Print summary
    print("\nSUMMARY:")
    for result in results:
        print(f"{result['route']}: {'✅ Accessible' if result['accessible'] else '❌ Not accessible'}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    print_all_routes()
    test_routes()
