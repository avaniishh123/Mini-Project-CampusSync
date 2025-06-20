from flask_pymongo import PyMongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson import ObjectId
from gridfs import GridFS
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize PyMongo instance
mongo = PyMongo()
# Initialize GridFS instance (will be set in init_db)
fs = None

def init_db(app):
    """Initialize the database connection
    
    Args:
        app: Flask application instance
        
    Returns:
        The database instance
    """
    try:
        # Initialize MongoDB connection
        mongo.init_app(app)
        
        # Test connection
        mongo.cx.admin.command('ping')
        logger.info("MongoDB connection successful")
        
        # Initialize GridFS
        global fs
        fs = GridFS(mongo.db)
        logger.info("GridFS initialized successfully")
        
        # Initialize required collections if they don't exist
        db = mongo.db
        
        # List of required collections
        required_collections = [
            'users',
            'posts',
            'comments',
            'post_likes',
            'comment_likes',  # Add comment_likes collection
            'notifications',
            'resources',
            'events',
            'opportunities',
            'binary_images'  # New collection for storing binary image data
        ]
        
        # Get existing collections
        existing_collections = db.list_collection_names()
        
        # Create missing collections
        for collection in required_collections:
            if collection not in existing_collections:
                db.create_collection(collection)
                logger.info(f"Created collection: {collection}")
        
        return db
    except ConnectionFailure as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise
    except ServerSelectionTimeoutError as e:
        logger.error(f"MongoDB server selection timeout: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error connecting to MongoDB: {e}")
        raise

def get_db():
    """Get the database instance
    
    Returns:
        The database instance
    """
    try:
        # Check if mongo.db is available
        if mongo.db is None:
            logger.warning("Database not initialized. Attempting to create new connection...")
            from pymongo import MongoClient
            import os
            mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/campusconnect")
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            # Test the connection
            client.admin.command('ping')
            logger.info("Successfully created new database connection")
            return client.get_database("CampusConnect")
        return mongo.db
    except Exception as e:
        logger.error(f"Error getting database: {str(e)}")
        raise ConnectionError(f"Failed to connect to database: {str(e)}")

def get_collection(collection_name):
    """Get a specific collection from the database
    
    Args:
        collection_name: Name of the collection
        
    Returns:
        The requested collection
    """
    if not mongo.db:
        logger.error("Database not initialized. Call init_db first.")
        raise ConnectionError("Database not initialized")
    
    return mongo.db[collection_name]

def get_gridfs():
    """Get the GridFS instance
    
    Returns:
        The GridFS instance
    """
    global fs
    if fs is None:
        logger.warning("GridFS not initialized. Initializing now...")
        fs = GridFS(get_db())
    return fs

def save_file_to_gridfs(file_data, filename, content_type):
    """Save a file to GridFS
    
    Args:
        file_data: The binary data of the file
        filename: The name of the file
        content_type: The MIME type of the file
        
    Returns:
        The GridFS file ID
    """
    try:
        fs = get_gridfs()
        file_id = fs.put(file_data, filename=filename, content_type=content_type)
        logger.info(f"File saved to GridFS with ID: {file_id}")
        return file_id
    except Exception as e:
        logger.error(f"Error saving file to GridFS: {str(e)}")
        raise

def get_file_from_gridfs(file_id):
    """Get a file from GridFS by ID
    
    Args:
        file_id: The GridFS file ID (string or ObjectId)
        
    Returns:
        The GridFS file or None if file not found or error
    """
    try:
        if file_id is None:
            logger.warning("Attempt to retrieve None file_id from GridFS")
            return None
            
        fs = get_gridfs()
        
        # Convert to ObjectId if it's a string
        if isinstance(file_id, str):
            try:
                file_id = ObjectId(file_id)
            except Exception as e:
                logger.error(f"Invalid ObjectId format for file_id: {file_id}, Error: {str(e)}")
                return None
        
        # Check if file exists
        if not fs.exists(file_id):
            logger.warning(f"File with ID {file_id} does not exist in GridFS")
            return None
            
        # Return the file
        return fs.get(file_id)
    except Exception as e:
        logger.error(f"Error retrieving file from GridFS: {str(e)}")
        return None

def save_binary_image(image_data, filename, content_type):
    """Save an image as binary data directly in MongoDB
    
    Args:
        image_data: The binary data of the image
        filename: Original filename
        content_type: The MIME type of the image
        
    Returns:
        The image document ID
    """
    try:
        db = get_db()
        image_doc = {
            'data': image_data,
            'filename': filename,
            'content_type': content_type
        }
        result = db.binary_images.insert_one(image_doc)
        logger.info(f"Image saved to binary_images with ID: {result.inserted_id}")
        return result.inserted_id
    except Exception as e:
        logger.error(f"Error saving binary image: {str(e)}")
        raise

def get_binary_image(image_id):
    """Get a binary image from MongoDB by ID
    
    Args:
        image_id: The image document ID
        
    Returns:
        The image document
    """
    try:
        db = get_db()
        return db.binary_images.find_one({'_id': image_id})
    except Exception as e:
        logger.error(f"Error retrieving binary image: {str(e)}")
        raise

def delete_file_from_gridfs(file_id):
    """Delete a file from GridFS by ID
    
    Args:
        file_id: The GridFS file ID (string or ObjectId)
        
    Returns:
        bool: True if successful, False if error occurred
    """
    try:
        # Validate file_id is not None
        if file_id is None:
            logger.warning("Attempt to delete None file_id from GridFS")
            return False
            
        fs = get_gridfs()
        
        # Convert to ObjectId if it's a string
        if isinstance(file_id, str):
            try:
                file_id = ObjectId(file_id)
            except Exception as e:
                logger.error(f"Invalid ObjectId format for file_id: {file_id}, Error: {str(e)}")
                return False
                
        # Check if file exists in GridFS
        if not fs.exists(file_id):
            logger.warning(f"File with ID {file_id} does not exist in GridFS")
            return False
            
        # Delete the file
        fs.delete(file_id)
        logger.info(f"File deleted from GridFS with ID: {file_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting file from GridFS: {str(e)}")
        return False