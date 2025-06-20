"""
Script to check all API endpoints in the CampusConnect backend
"""

from app import create_app
import json
from flask import url_for
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def has_no_empty_params(rule):
    """Check if a rule has no empty parameters"""
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)

def get_all_endpoints():
    """Get all endpoints in the application"""
    app = create_app()
    endpoints = []
    
    with app.app_context():
        for rule in app.url_map.iter_rules():
            # Skip static endpoints
            if "static" in rule.endpoint:
                continue
                
            methods = [method for method in rule.methods if method not in ['HEAD', 'OPTIONS']]
            
            # Skip rules that require parameters
            if has_no_empty_params(rule):
                url = url_for(rule.endpoint, **(rule.defaults or {}))
            else:
                # Replace parameters with placeholders
                url = rule.rule
            
            endpoints.append({
                "endpoint": url,
                "methods": methods,
                "blueprint": rule.endpoint.split('.')[0] if '.' in rule.endpoint else None
            })
    
    return endpoints

def group_endpoints_by_blueprint(endpoints):
    """Group endpoints by blueprint"""
    grouped = {}
    
    for endpoint in endpoints:
        blueprint = endpoint.get("blueprint") or "root"
        
        if blueprint not in grouped:
            grouped[blueprint] = []
            
        grouped[blueprint].append(endpoint)
    
    return grouped

def main():
    """Main function"""
    try:
        # Get all endpoints
        endpoints = get_all_endpoints()
        
        # Group endpoints by blueprint
        grouped_endpoints = group_endpoints_by_blueprint(endpoints)
        
        # Print endpoints by blueprint
        print("\n" + "=" * 80)
        print("CAMPUSCONNECT API ENDPOINTS")
        print("=" * 80 + "\n")
        
        total_endpoints = 0
        
        for blueprint, endpoints in grouped_endpoints.items():
            print(f"\n## {blueprint.upper()} ENDPOINTS")
            print("-" * 80)
            
            for endpoint in endpoints:
                methods = ", ".join(endpoint["methods"])
                print(f"{methods:10} {endpoint['endpoint']}")
                total_endpoints += 1
            
            print("-" * 80)
        
        print(f"\nTotal endpoints: {total_endpoints}")
        print("\n" + "=" * 80)
        
        # Save endpoints to JSON file
        with open("api_endpoints.json", "w") as f:
            json.dump(grouped_endpoints, f, indent=2)
            
        print(f"Endpoints saved to api_endpoints.json")
        print("=" * 80 + "\n")
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
