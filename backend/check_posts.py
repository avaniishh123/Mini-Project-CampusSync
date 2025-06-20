from app.db import get_db

db = get_db()
posts = list(db.posts.find({}))

print('\nPost details:')
for i, post in enumerate(posts):
    print(f'\nPost {i+1}:')
    print(f'Title: {post.get("title", "No title")}')
    print(f'Content: {post.get("content", "No content")[:100]}...')
    print(f'Author ID: {post.get("author_id", "No author")}')
    print(f'Moderation Status: {post.get("moderation_status", "No status")}') 