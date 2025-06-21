from app import create_app
import os
import logging
from dotenv import load_dotenv
from flask import send_from_directory, redirect, render_template

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create application instance
app = create_app()

# Serve frontend files if they exist
@app.route('/<path:path>')
def serve_frontend(path):
    frontend_build_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'build')
    if os.path.exists(os.path.join(frontend_build_dir, path)):
        return send_from_directory(frontend_build_dir, path)
    return app.send_static_file('test.html')  # Fallback to test page

if __name__ == "__main__":
    # Get configuration from environment variables
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))  # Replit uses PORT environment variable
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    logger.info(f"Starting CampusConnect API server on {host}:{port} (debug={debug})")
    
    # Run the application
    app.run(host=host, port=port, debug=debug)