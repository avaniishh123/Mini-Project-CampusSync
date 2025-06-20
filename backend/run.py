from app import create_app
import os
import logging
from dotenv import load_dotenv

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

if __name__ == "__main__":
    # Get configuration from environment variables
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    logger.info(f"Starting CampusConnect API server on {host}:{port} (debug={debug})")
    
    # Run the application
    app.run(host=host, port=port, debug=debug)