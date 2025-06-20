#!/usr/bin/env python
"""
Setup script for CampusConnect backend
This script creates the required directories and initializes the database
"""

import os
import sys
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def create_directories():
    """Create required directories"""
    logger.info("Creating required directories...")
    
    # Create uploads directory
    uploads_dir = os.path.join(os.getcwd(), 'uploads')
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        logger.info(f"Created directory: {uploads_dir}")
    
    # Create resources directory
    resources_dir = os.path.join(uploads_dir, 'resources')
    if not os.path.exists(resources_dir):
        os.makedirs(resources_dir)
        logger.info(f"Created directory: {resources_dir}")
    
    # Create profiles directory
    profiles_dir = os.path.join(uploads_dir, 'profiles')
    if not os.path.exists(profiles_dir):
        os.makedirs(profiles_dir)
        logger.info(f"Created directory: {profiles_dir}")
    
    # Create media directory
    media_dir = os.path.join(uploads_dir, 'media')
    if not os.path.exists(media_dir):
        os.makedirs(media_dir)
        logger.info(f"Created directory: {media_dir}")
    
    logger.info("Directory creation complete.")

def setup_database():
    """Initialize the database with required collections"""
    logger.info("Setting up database...")
    
    # Get MongoDB URI from environment variables or from config.py
    mongo_uri = os.getenv('MONGO_URI')
    
    if not mongo_uri:
        # Try to get from config.py
        try:
            sys.path.append(os.getcwd())
            from app.config import MONGO_URI
            mongo_uri = MONGO_URI
            logger.info(f"Using MongoDB URI from config.py")
        except ImportError:
            logger.error("MONGO_URI environment variable not set and couldn't import from config.py")
            logger.info("Using default MongoDB URI: mongodb://localhost:27017/campusconnect")
            mongo_uri = "mongodb://localhost:27017/campusconnect"
    
    try:
        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        db = client.get_database()
        
        # Create collections
        collections = [
            'users',
            'posts',
            'comments',
            'likes',
            'resources',
            'resource_votes',
            'opportunities',
            'applications',
            'verification_requests',
            'notifications'
        ]
        
        for collection_name in collections:
            if collection_name not in db.list_collection_names():
                db.create_collection(collection_name)
                logger.info(f"Created collection: {collection_name}")
        
        # Create indexes
        db.users.create_index('email', unique=True)
        db.users.create_index('username', unique=True)
        db.posts.create_index('author_id')
        db.posts.create_index('created_at')
        db.comments.create_index('post_id')
        db.likes.create_index([('post_id', 1), ('user_id', 1)], unique=True)
        db.resources.create_index('uploader_id')
        db.resources.create_index('created_at')
        db.opportunities.create_index('poster_id')
        db.opportunities.create_index('created_at')
        db.applications.create_index([('opportunity_id', 1), ('applicant_id', 1)], unique=True)
        db.notifications.create_index('user_id')
        
        logger.info("Database setup complete.")
        
    except Exception as e:
        logger.error(f"Error setting up database: {str(e)}")
        sys.exit(1)

def main():
    """Main setup function"""
    logger.info("Starting CampusConnect backend setup...")
    
    create_directories()
    setup_database()
    
    logger.info("Setup complete. You can now run the application.")

if __name__ == "__main__":
    main()
