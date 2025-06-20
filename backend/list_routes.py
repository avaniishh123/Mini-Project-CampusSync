"""
Script to list all routes in the CampusConnect backend
"""

from app import create_app
import json

def main():
    """Main function to list all routes"""
    app = create_app()
    
    print("\n" + "=" * 80)
    print("CAMPUSCONNECT API ROUTES")
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
                "endpoint": rule.endpoint
            })
    
    # Print routes by blueprint
    total_routes = 0
    
    for blueprint, routes in sorted(routes_by_blueprint.items()):
        print(f"\n## {blueprint.upper()} ROUTES")
        print("-" * 80)
        
        for route in sorted(routes, key=lambda x: x["route"]):
            methods = ", ".join(route["methods"])
            print(f"{methods:20} {route['route']}")
            total_routes += 1
        
        print("-" * 80)
    
    print(f"\nTotal routes: {total_routes}")
    print("\n" + "=" * 80)
    
    # Save routes to JSON file
    with open("api_routes.json", "w") as f:
        json.dump(routes_by_blueprint, f, indent=2)
        
    print(f"Routes saved to api_routes.json")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
