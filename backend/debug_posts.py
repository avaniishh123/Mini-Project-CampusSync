from app.db import get_db
from bson import ObjectId
import json

def check_post_structure(post):
    required_fields = ['title', 'content', 'category', 'author_id', 'created_at', 'is_moderated', 'moderation_status']
    missing_fields = [field for field in required_fields if field not in post]
    invalid_fields = []
    
    if missing_fields:
        print(f"Missing fields in post {post.get('_id')}: {missing_fields}")
    
    # Check field types
    if not isinstance(post.get('title', ''), str):
        invalid_fields.append('title')
    if not isinstance(post.get('content', ''), str):
        invalid_fields.append('content')
    if not isinstance(post.get('category', ''), str):
        invalid_fields.append('category')
    if not isinstance(post.get('author_id', ''), str):
        invalid_fields.append('author_id')
    if not isinstance(post.get('is_moderated', False), bool):
        invalid_fields.append('is_moderated')
    if not isinstance(post.get('moderation_status', ''), str):
        invalid_fields.append('moderation_status')
    
    if invalid_fields:
        print(f"Invalid field types in post {post.get('_id')}: {invalid_fields}")
    
    return bool(missing_fields or invalid_fields)

try:
    print("Attempting to connect to database...")
    db = get_db()
    print("Successfully connected to database")
    
    print("\nFetching all posts...")
    posts = list(db.posts.find({}))
    print(f"Found {len(posts)} posts")
    
    print("\nChecking post structures...")
    has_issues = False
    for post in posts:
        post['_id'] = str(post['_id'])  # Convert ObjectId to string for display
        if check_post_structure(post):
            has_issues = True
            print("\nProblematic post details:")
            print(json.dumps(post, default=str, indent=2))
    
    if not has_issues:
        print("\nAll posts have valid structure")
    
    print("\nChecking user references...")
    user_ids = set(post['author_id'] for post in posts)
    for user_id in user_ids:
        try:
            user = db.users.find_one({'_id': ObjectId(user_id)})
            if not user:
                print(f"Warning: User {user_id} referenced in posts does not exist")
        except Exception as e:
            print(f"Error checking user {user_id}: {str(e)}")

except Exception as e:
    print(f"Error: {str(e)}") 