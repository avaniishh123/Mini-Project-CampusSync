from app import create_app
from flask import current_app
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = create_app()

with app.app_context():
    print("\nFlask App Configuration:")
    for key, value in app.config.items():
        if not key.startswith('_'):
            print(f"{key}: {value}")
    
    print("\nRegistered Blueprints:")
    for blueprint in app.blueprints:
        print(f"- {blueprint}")
        for rule in app.url_map.iter_rules():
            if rule.endpoint.startswith(blueprint):
                print(f"  * {rule.rule} [{', '.join(rule.methods)}]") 