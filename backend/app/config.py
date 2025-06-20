import os
import sys
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Configuration
# First try to get MongoDB URI directly
MONGO_URI = os.getenv("MONGO_URI")

# If not set, try to build it from components
if not MONGO_URI:
    username = os.getenv("MONGO_USERNAME")
    password = os.getenv("MONGO_PASSWORD")
    host = os.getenv("MONGO_HOST")
    
    # Check if required MongoDB environment variables are set
    if all([username, password, host]):
        # URL encode username and password for MongoDB URI
        password_enc = quote_plus(password)
        username_enc = quote_plus(username)
        MONGO_URI = f"mongodb+srv://{username_enc}:{password_enc}@{host}/?retryWrites=true&w=majority"
    else:
        print("MongoDB environment variables are not properly set.")
        print("Using local MongoDB instance for development.")
        MONGO_URI = "mongodb://localhost:27017/campusconnect"

class Config:
    """Base configuration class for the application"""
    MONGO_URI = MONGO_URI
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key_for_development")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    API_VERSION = os.getenv("API_VERSION", "v1")
    ENABLE_AI_MODERATION = True  # Enable AI moderation to auto-approve posts
    
    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25MB max upload size
    
    # File type configurations
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'}
    ALLOWED_RESOURCE_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'}
    
    # File size limits (in bytes)
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB for images
    MAX_DOCUMENT_SIZE = 25 * 1024 * 1024  # 25MB for documents
    MAX_RESOURCE_SIZE = 50 * 1024 * 1024  # 50MB for resources
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Email settings
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")
    EMAIL_ENABLED = all([SMTP_USERNAME, SMTP_PASSWORD, SENDER_EMAIL])

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    FLASK_ENV = "production"

# Configuration dictionary to easily switch between environments
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig
}

# Get configuration based on environment
def get_config():
    env = os.getenv("FLASK_ENV", "development")
    return config_by_name[env]
