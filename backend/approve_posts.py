from app.db import get_db

db = get_db()

# Update all posts to be approved
result = db.posts.update_many(
    {'moderation_status': {'$ne': 'approved'}},
    {'$set': {'moderation_status': 'approved', 'is_moderated': True}}
)

print(f'Updated {result.modified_count} posts to approved status') 