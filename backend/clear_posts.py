# clear_posts.py
from pymongo import MongoClient
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clear_posts():
    """Clear all posts from the database"""
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['campusconnect']
        
        # Get collection counts before deletion
        posts_count = db.posts.count_documents({})
        comments_count = db.comments.count_documents({})
        likes_count = db.post_likes.count_documents({})
        
        # Delete all posts
        result = db.posts.delete_many({})
        logger.info(f"Deleted {result.deleted_count} posts")
        
        # Delete all comments
        result = db.comments.delete_many({})
        logger.info(f"Deleted {result.deleted_count} comments")
        
        # Delete all post likes
        result = db.post_likes.delete_many({})
        logger.info(f"Deleted {result.deleted_count} post likes")
        
        # Log the results
        logger.info(f"Successfully cleared {posts_count} posts, {comments_count} comments, and {likes_count} likes from the database")
        
        return {
            "posts_deleted": posts_count,
            "comments_deleted": comments_count,
            "likes_deleted": likes_count
        }
    except Exception as e:
        logger.error(f"Error clearing posts: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    result = clear_posts()
    print("Database cleanup complete!")
    print(f"Deleted {result.get('posts_deleted', 0)} posts")
    print(f"Deleted {result.get('comments_deleted', 0)} comments")
    print(f"Deleted {result.get('likes_deleted', 0)} post likes")
