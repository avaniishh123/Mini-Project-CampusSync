"""
Test script to verify MongoDB connection
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import logging
from app.db import get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_mongodb_connection():
    """Test MongoDB connection"""
    try:
        # Get MongoDB URI from environment variables
        mongo_uri = os.getenv("MONGO_URI")
        
        if not mongo_uri:
            logger.error("MONGO_URI environment variable not set")
            return False
        
        # Create a MongoDB client
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection by getting server info
        server_info = client.server_info()
        
        logger.info(f"MongoDB connection successful. Server version: {server_info.get('version')}")
        
        # Test database access
        db = client.get_database("CampusConnect")
        
        # List collections
        collections = db.list_collection_names()
        logger.info(f"Collections in database: {collections}")
        
        # Create a test document
        test_collection = db.test_collection
        result = test_collection.insert_one({"test": "data", "timestamp": "test_timestamp"})
        
        logger.info(f"Test document inserted with ID: {result.inserted_id}")
        
        # Delete the test document
        test_collection.delete_one({"_id": result.inserted_id})
        
        logger.info("Test document deleted")
        
        return True
    
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def test_database():
    try:
        # Get database connection
        db = get_db()
        logger.info("Successfully connected to database")
        
        # List all collections
        collections = db.list_collection_names()
        logger.info(f"Available collections: {collections}")
        
        # Check posts collection
        if 'posts' in collections:
            posts_count = db.posts.count_documents({})
            logger.info(f"Number of posts in database: {posts_count}")
            
            # Get a sample post if any exist
            if posts_count > 0:
                sample_post = db.posts.find_one({})
                logger.info(f"Sample post: {sample_post}")
            else:
                logger.warning("No posts found in the database")
        else:
            logger.warning("Posts collection does not exist")
            
        # Check users collection
        if 'users' in collections:
            users_count = db.users.count_documents({})
            logger.info(f"Number of users in database: {users_count}")
        else:
            logger.warning("Users collection does not exist")
            
    except Exception as e:
        logger.error(f"Error testing database: {str(e)}")

if __name__ == "__main__":
    if test_mongodb_connection():
        print("MongoDB connection test passed!")
    else:
        print("MongoDB connection test failed!")

    test_database()
