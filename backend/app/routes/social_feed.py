# app/routes/social_feed.py

from flask import Blueprint, request, jsonify, g, current_app
from app.db import get_db
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import logging
import json
import requests
from app.routes.users import token_required, verification_required
from werkzeug.utils import secure_filename
import os
import uuid

logger = logging.getLogger(__name__)

social_feed_bp = Blueprint('social_feed', __name__, url_prefix='/api/social-feed')

@social_feed_bp.route('/clear-all-posts', methods=['DELETE'])
@token_required
def clear_all_posts():
    """Clear all posts from the database (development only)"""
    try:
        # Check if user is an admin
        if g.user.get('role') != 'admin':
            # For development purposes, allow any authenticated user to clear posts
            # In production, you would want to restrict this to admins only
            logger.warning(f"Non-admin user {g.user['email']} is clearing all posts")
        
        db = get_db()
        
        # Get collection counts before deletion
        posts_count = db.posts.count_documents({})
        comments_count = db.comments.count_documents({})
        likes_count = db.post_likes.count_documents({}) if 'post_likes' in db.list_collection_names() else 0
        
        # Delete all posts
        posts_result = db.posts.delete_many({})
        
        # Delete all comments
        comments_result = db.comments.delete_many({})
        
        # Delete all post likes if collection exists
        likes_result = db.post_likes.delete_many({}) if 'post_likes' in db.list_collection_names() else None
        likes_deleted = likes_result.deleted_count if likes_result else 0
        
        logger.info(f"Cleared {posts_result.deleted_count} posts, {comments_result.deleted_count} comments, and {likes_deleted} likes")
        
        return jsonify({
            'status': 'success',
            'message': 'All posts cleared successfully',
            'data': {
                'posts_deleted': posts_result.deleted_count,
                'comments_deleted': comments_result.deleted_count,
                'likes_deleted': likes_deleted
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error clearing all posts: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while clearing posts: {str(e)}'
        }), 500

@social_feed_bp.route('/posts', methods=['GET'])
@token_required
@verification_required
def get_posts():
    """Get all posts with optional filtering"""
    try:
        logger.info("Starting get_posts request")
        # Get query parameters
        category = request.args.get('category')
        author_id = request.args.get('author_id')
        search = request.args.get('search')
        limit = int(request.args.get('limit', 20))
        skip = int(request.args.get('skip', 0))
        
        logger.info(f"Query parameters: category={category}, author_id={author_id}, search={search}, limit={limit}, skip={skip}")
        
        # Build query
        query = {}
        
        # Show all approved posts and posts by the current user
        query['$or'] = [
            {'moderation_status': 'approved'},  # All users can see approved posts
            {'author_id': str(g.user['_id'])}  # Users can see their own pending/rejected posts
        ]
        
        if category and category != 'all':
            query['category'] = category
        
        if author_id:
            # If filtering by author, still respect moderation status
            query = {
                '$and': [
                    {'author_id': author_id},
                    {'$or': [
                        {'moderation_status': 'approved'},  # Show approved posts of the author
                        {'author_id': str(g.user['_id'])}  # Show all own posts if the author is the current user
                    ]}
                ]
            }
        
        if search:
            query['$and'] = [
                {'$or': [
                    {'moderation_status': 'approved'},
                    {'author_id': str(g.user['_id'])}
                ]},
                {'$or': [
                    {'title': {'$regex': search, '$options': 'i'}},
                    {'content': {'$regex': search, '$options': 'i'}},
                    {'tags': {'$regex': search, '$options': 'i'}}
                ]}
            ]
        
        logger.info(f"Final MongoDB query: {query}")
        
        try:
            db = get_db()
            logger.info("Successfully connected to database")
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Database connection error. Please try again later.'
            }), 500
            
        # Get sentiment filter if provided
        sentiment_filter = request.args.get('sentiment')
        if sentiment_filter and sentiment_filter.lower() not in ['all', '']:
            # Use case-insensitive regex for sentiment matching
            query['sentiment'] = {'$regex': f'^{sentiment_filter}$', '$options': 'i'}
            
        try:
            # Get posts from database
            logger.info("Fetching posts from database")
            posts = list(db.posts.find(query).sort('created_at', -1).skip(skip).limit(limit))
            logger.info(f"Found {len(posts)} posts matching query")
            
            # Get author details for each post
            for post in posts:
                post['_id'] = str(post['_id'])
                
                # Format timestamps
                post['created_at'] = format_timestamp(post['created_at'])
                post['updated_at'] = format_timestamp(post.get('updated_at'))
                
                # Get author details
                try:
                    author = db.users.find_one(
                        {'_id': ObjectId(post['author_id'])},
                        {'password_hash': 0, 'verification': 0, 'notifications': 0}
                    )
                    
                    if author:
                        post['author'] = {
                            'id': str(author['_id']),
                            'username': author['username'],
                            'name': author['name'],
                            'profile_picture': author['profile_picture']
                        }
                    else:
                        logger.warning(f"Author not found for post {post['_id']}")
                        post['author'] = {
                            'id': post['author_id'],
                            'username': 'Unknown',
                            'name': 'Unknown User',
                            'profile_picture': None
                        }
                except Exception as author_error:
                    logger.error(f"Error getting author details: {str(author_error)}")
                    post['author'] = {
                        'id': post['author_id'],
                        'username': 'Unknown',
                        'name': 'Unknown User',
                        'profile_picture': None
                    }
                
                # Get comment count
                try:
                    post['comment_count'] = db.comments.count_documents({'post_id': str(post['_id'])})
                except Exception as comment_error:
                    logger.error(f"Error counting comments: {str(comment_error)}")
                    post['comment_count'] = 0
                
                # Get like count
                try:
                    post['like_count'] = db.post_likes.count_documents({'post_id': str(post['_id'])})
                except Exception as like_error:
                    logger.warning(f"Error counting likes: {str(like_error)}")
                    post['like_count'] = 0
                
                # Check if current user has liked the post
                try:
                    post['is_liked'] = db.post_likes.count_documents({
                        'post_id': str(post['_id']),
                        'user_id': str(g.user['_id'])
                    }) > 0
                except Exception as like_error:
                    logger.warning(f"Error checking if post is liked: {str(like_error)}")
                    post['is_liked'] = False
            
            # Get total count
            total_count = db.posts.count_documents(query)
            logger.info(f"Total count: {total_count}")
            
            return jsonify({
                'status': 'success',
                'data': {
                    'posts': posts,
                    'total_count': total_count,
                    'has_more': total_count > skip + limit
                }
            }), 200
            
        except Exception as db_error:
            logger.error(f"Database operation error: {str(db_error)}")
            return jsonify({
                'status': 'error',
                'message': f'Error retrieving posts from database: {str(db_error)}'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in get posts: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while retrieving posts: {str(e)}'
        }), 500

@social_feed_bp.route('/posts', methods=['POST'])
@token_required
@verification_required
def create_post():
    """Create a new post"""
    try:
        logger.info("Received request to create post")
        logger.info(f"Request files: {request.files}")
        logger.info(f"Request form: {request.form}")
        
        db = get_db()
        media_items = []
        content = None
        title = None
        category = None
        is_anonymous = False
        has_files = bool(request.files)
        
        logger.info(f"Has files: {has_files}")
        
        # Handle image upload
        if 'image' in request.files:
            image_file = request.files['image']
            logger.info(f"Processing image file: {image_file.filename}")
            
            if image_file.filename != '':
                # Check if file extension is allowed
                file_ext = os.path.splitext(image_file.filename)[1].lower().replace('.', '')
                if file_ext not in current_app.config['ALLOWED_IMAGE_EXTENSIONS']:
                    logger.error(f"Invalid image file extension: {file_ext}")
                    return jsonify({
                        'status': 'error',
                        'message': f'Image type not allowed. Allowed types: {", ".join(current_app.config["ALLOWED_IMAGE_EXTENSIONS"])}'
                    }), 400
                
                # Validate image file size
                file_size = len(image_file.read())
                logger.info(f"Image file size: {file_size} bytes")
                image_file.seek(0)  # Reset file pointer after reading
                
                if file_size > current_app.config['MAX_IMAGE_SIZE']:
                    logger.error(f"Image file too large: {file_size} bytes")
                    return jsonify({
                        'status': 'error',
                        'message': f'Image file size should be less than {current_app.config["MAX_IMAGE_SIZE"] // (1024 * 1024)}MB'
                    }), 400
                
                # Save the image using the helper function from users.py
                from app.routes.users import save_uploaded_image
                image_data = save_uploaded_image(image_file, folder='post_images')
                if image_data:
                    # Add more metadata for the frontend to properly handle the file
                    media_item = {
                        'url': image_data['file_url'],
                        'type': 'image',
                        'filename': image_data['original_filename'],
                        'content_type': image_data['content_type'],
                        'is_image': True
                    }
                    media_items.append(media_item)
                    logger.info(f"Saved post image: {image_data['file_url']}")
                else:
                    logger.error("Failed to save post image")
                    return jsonify({
                        'status': 'error',
                        'message': 'Failed to save image file'
                    }), 500

        # Handle attachment upload
        if 'attachment' in request.files:
            attachment_file = request.files['attachment']
            logger.info(f"Processing attachment file: {attachment_file.filename}")
            
            if attachment_file.filename != '':
                # Check if file extension is allowed
                file_ext = os.path.splitext(attachment_file.filename)[1].lower().replace('.', '')
                if file_ext not in current_app.config['ALLOWED_DOCUMENT_EXTENSIONS']:
                    logger.error(f"Invalid attachment file extension: {file_ext}")
                    return jsonify({
                        'status': 'error',
                        'message': f'Document type not allowed. Allowed types: {", ".join(current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"])}'
                    }), 400
                
                # Validate attachment file size
                file_size = len(attachment_file.read())
                logger.info(f"Attachment file size: {file_size} bytes")
                attachment_file.seek(0)  # Reset file pointer after reading
                
                if file_size > current_app.config['MAX_DOCUMENT_SIZE']:
                    logger.error(f"Attachment file too large: {file_size} bytes")
                    return jsonify({
                        'status': 'error',
                        'message': f'Document file size should be less than {current_app.config["MAX_DOCUMENT_SIZE"] // (1024 * 1024)}MB'
                    }), 400
                
                # Save the attachment
                from app.routes.users import save_uploaded_image
                attachment_data = save_uploaded_image(attachment_file, folder='post_attachments')
                if attachment_data:
                    # Add more metadata for the frontend to properly handle the file
                    media_item = {
                        'url': attachment_data['file_url'],
                        'type': 'document',
                        'filename': attachment_data['original_filename'],
                        'content_type': attachment_data['content_type'],
                        'is_image': False
                    }
                    media_items.append(media_item)
                    logger.info(f"Saved post attachment: {attachment_data['file_url']}")
                else:
                    logger.error("Failed to save post attachment")
                    return jsonify({
                        'status': 'error',
                        'message': 'Failed to save attachment file'
                    }), 500
        
        # Get post data from form data or JSON
        if has_files:
            logger.info("Getting post data from form")
            content = request.form.get('content')
            title = request.form.get('title')
            category = request.form.get('category', 'general')
            is_anonymous = request.form.get('is_anonymous', 'false').lower() == 'true'
        else:
            logger.info("Getting post data from JSON")
            data = request.get_json()
            
            # Handle chunked content from JSON
            if 'content_chunks' in data:
                content = ''.join(data['content_chunks'])
            else:
                content = data.get('content', '')
            
            title = data.get('title')
            category = data.get('category', 'general')
            is_anonymous = data.get('is_anonymous', False)
            # If media_items are provided in JSON, use them
            if 'media_items' in data:
                media_items = data.get('media_items', [])
        
        # Validate content
        if not content or not content.strip():
            logger.error("Content is empty")
            return jsonify({
                'status': 'error',
                'message': 'Content is required'
            }), 400
        
        # If title is not provided, use the first line of content
        if not title:
            title = content.split('\n')[0][:100]  # Limit title to 100 characters
        
        # Create new post
        new_post = {
            'title': title,
            'content': content,
            'category': category,
            'author_id': str(g.user['_id']),
            'created_at': datetime.now(timezone.utc),
            'updated_at': None,
            'tags': [],
            'is_anonymous': is_anonymous,
            'media_items': media_items,  # Use the enhanced media items data
            'like_count': 0,
            'comment_count': 0,
            'is_moderated': True,  # Auto-approve posts
            'moderation_status': 'approved',
            'moderation_feedback': None
        }
        
        # Add sentiment analysis
        try:
            sentiment_result = analyze_post_sentiment(content)
            new_post.update({
                'sentiment': sentiment_result['sentiment'],
                'sentiment_score': sentiment_result['score'],
                'emotional_intensity': sentiment_result['emotionalIntensity'],
                'detected_emotions': sentiment_result['detectedEmotions']
            })
        except Exception as e:
            logger.error(f"Error analyzing sentiment during creation: {str(e)}")
            # Set default sentiment values if analysis fails
            new_post.update({
                'sentiment': 'Neutral',
                'sentiment_score': 50,
                'emotional_intensity': 5,
                'detected_emotions': [{'name': 'Calmness', 'percentage': 50}]
            })
        
        logger.info("Inserting new post into database")
        result = db.posts.insert_one(new_post)
        
        # Get the complete post object to return
        created_post = db.posts.find_one({'_id': result.inserted_id})
        created_post['_id'] = str(created_post['_id'])
        
        # Add author details
        author = db.users.find_one({'_id': ObjectId(created_post['author_id'])})
        created_post['author'] = {
            'id': str(author['_id']),
            'username': author['username'],
            'name': author.get('name', author['username']),
            'profile_picture': author.get('profile_picture', 'https://via.placeholder.com/150')
        }
        
        # Format timestamps
        created_post['created_at'] = format_timestamp(created_post['created_at'])
        if created_post['updated_at']:
            created_post['updated_at'] = format_timestamp(created_post['updated_at'])
        
        logger.info(f"Successfully created post with ID: {created_post['_id']}")
        return jsonify({
            'status': 'success',
            'message': 'Post created successfully',
            'data': {
                'post_id': str(result.inserted_id),
                'is_moderated': True,
                'post': created_post
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in create_post: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while creating post: {str(e)}'
        }), 500

@social_feed_bp.route('/posts/<post_id>', methods=['GET'])
@token_required
@verification_required
def get_post(post_id):
    """Get a specific post with comments"""
    try:
        db = get_db()
        
        # Find post by ID
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Convert ObjectId to string and format timestamps
        post['_id'] = str(post['_id'])
        post['created_at'] = format_timestamp(post['created_at'])
        post['updated_at'] = format_timestamp(post.get('updated_at'))
        
        # Get author details
        if not post.get('is_anonymous', False):
            author = db.users.find_one(
                {'_id': ObjectId(post['author_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            
            if author:
                post['author'] = {
                    'id': str(author['_id']),
                    'username': author['username'],
                    'name': author['name'],
                    'profile_picture': author['profile_picture']
                }
        else:
            post['author'] = {
                'id': None,
                'username': 'Anonymous',
                'name': 'Anonymous User',
                'profile_picture': None
            }
        
        # Get comments
        comments = list(db.comments.find({'post_id': post_id}).sort('created_at', 1))
        
        # Process comments
        for comment in comments:
            comment['_id'] = str(comment['_id'])
            comment['created_at'] = format_timestamp(comment['created_at'])
            
            # Get comment author details
            if not comment.get('is_anonymous', False):
                comment_author = db.users.find_one(
                    {'_id': ObjectId(comment['author_id'])},
                    {'password_hash': 0, 'verification': 0, 'notifications': 0}
                )
                
                if comment_author:
                    comment['author'] = {
                        'id': str(comment_author['_id']),
                        'username': comment_author['username'],
                        'name': comment_author['name'],
                        'profile_picture': comment_author['profile_picture']
                    }
            else:
                comment['author'] = {
                    'id': None,
                    'username': 'Anonymous',
                    'name': 'Anonymous User',
                    'profile_picture': None
                }
            
            # Get like count for comment
            try:
                comment['like_count'] = db.post_likes.count_documents({
                    'comment_id': str(comment['_id']),
                    'type': 'comment'
                })
            except Exception as like_error:
                logger.warning(f"Error counting comment likes: {str(like_error)}")
                comment['like_count'] = 0
            
            # Check if current user has liked the comment
            try:
                comment['is_liked'] = db.post_likes.count_documents({
                    'comment_id': str(comment['_id']),
                    'user_id': str(g.user['_id']),
                    'type': 'comment'
                }) > 0
            except Exception as like_error:
                logger.warning(f"Error checking if comment is liked: {str(like_error)}")
                comment['is_liked'] = False
        
        # Get like count for post
        try:
            post['like_count'] = db.post_likes.count_documents({
                'post_id': post_id
            })
        except Exception as like_error:
            logger.warning(f"Error counting post likes: {str(like_error)}")
            post['like_count'] = 0
        
        # Check if current user has liked the post
        try:
            post['is_liked'] = db.post_likes.count_documents({
                'post_id': post_id,
                'user_id': str(g.user['_id'])
            }) > 0
        except Exception as like_error:
            logger.warning(f"Error checking if post is liked: {str(like_error)}")
            post['is_liked'] = False
        
        return jsonify({
            'status': 'success',
            'data': {
                'post': post,
                'comments': comments
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get post: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving post'
        }), 500

@social_feed_bp.route('/posts/<post_id>', methods=['PUT'])
@token_required
@verification_required
def update_post(post_id):
    """Update a post"""
    try:
        db = get_db()
        
        # Find post by ID
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Check if user is the author of the post
        if post['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this post'
            }), 403
        
        # Check if the request contains files
        has_files = request.files and ('image' in request.files or 'attachment' in request.files)
        
        # Get post data from form data or JSON
        if has_files:
            logger.info("Received post update with file upload")
            content = request.form.get('content')
            link = request.form.get('link')
            
            # Initialize media_urls as empty list since we're replacing media
            media_items = []
            
            # Handle image upload
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file.filename != '':
                    # Validate image file size (10MB limit)
                    if len(image_file.read()) > 10 * 1024 * 1024:
                        return jsonify({
                            'status': 'error',
                            'message': 'Image file size should be less than 10MB'
                        }), 400
                    image_file.seek(0)  # Reset file pointer after reading
                    
                    # Save the image using the helper function from users.py
                    from app.routes.users import save_uploaded_image
                    image_data = save_uploaded_image(image_file, folder='post_images')
                    if image_data:
                        # Add more metadata for the frontend to properly handle the file
                        media_item = {
                            'url': image_data['file_url'],
                            'type': 'image',
                            'filename': image_data['original_filename'],
                            'content_type': image_data['content_type'],
                            'is_image': True
                        }
                        media_items.append(media_item)
                        logger.info(f"Saved post image: {image_data['file_url']}")
                else:
                    # If no new image is uploaded but there are existing media_urls, keep them
                    media_items = post.get('media_items', [])
            
            # Handle attachment upload
            if 'attachment' in request.files:
                attachment_file = request.files['attachment']
                if attachment_file.filename != '':
                    # Validate attachment file size (25MB limit)
                    if len(attachment_file.read()) > 25 * 1024 * 1024:
                        return jsonify({
                            'status': 'error',
                            'message': 'Attachment file size should be less than 25MB'
                        }), 400
                    attachment_file.seek(0)  # Reset file pointer after reading
                    
                    # Save the attachment
                    from app.routes.users import save_uploaded_image
                    attachment_data = save_uploaded_image(attachment_file, folder='post_attachments')
                    if attachment_data:
                        # Add more metadata for the frontend to properly handle the file
                        media_item = {
                            'url': attachment_data['file_url'],
                            'type': 'document',
                            'filename': attachment_data['original_filename'],
                            'content_type': attachment_data['content_type'],
                            'is_image': False
                        }
                        media_items.append(media_item)
                        logger.info(f"Saved post attachment: {attachment_data['file_url']}")
            
            # Update fields
            update_fields = {
                'content': content,
                'media_items': media_items,  # Replace old media_urls with new ones
                'updated_at': datetime.now(timezone.utc)  # Only update the updated_at field
            }
            if link:
                update_fields['link'] = link
            elif link == '':  # Explicitly remove link if empty string
                update_fields['link'] = None
        else:
            logger.info("Received post update without file upload")
            data = request.get_json()
            
            content = data.get('content')
            # Update fields
            update_fields = {
                'content': content,
                'updated_at': datetime.now(timezone.utc)  # Only update the updated_at field
            }
            
            # Handle link update
            if 'link' in data:
                update_fields['link'] = data['link'] if data['link'] else None
            
            # Handle media_urls update
            if 'media_items' in data:
                update_fields['media_items'] = data['media_items']
            else:
                # Keep existing media_urls if not being updated
                update_fields['media_items'] = post.get('media_items', [])

        # Update sentiment if content has changed
        if 'content' in update_fields and update_fields['content'] != post.get('content'):
            try:
                sentiment_result = analyze_post_sentiment(update_fields['content'])
                update_fields.update({
                    'sentiment': sentiment_result['sentiment'],
                    'sentiment_score': sentiment_result['score'],
                    'emotional_intensity': sentiment_result['emotionalIntensity'],
                    'detected_emotions': sentiment_result['detectedEmotions']
                })
            except Exception as e:
                logger.error(f"Error analyzing sentiment during update: {str(e)}")
                # Keep existing sentiment values if analysis fails
                update_fields.update({
                    'sentiment': post.get('sentiment', 'Neutral'),
                    'sentiment_score': post.get('sentiment_score', 50),
                    'emotional_intensity': post.get('emotional_intensity', 5),
                    'detected_emotions': post.get('detected_emotions', [{'name': 'Calmness', 'percentage': 50}])
                })
        
        # Update post - preserve created_at by only updating specified fields
        result = db.posts.update_one(
            {'_id': ObjectId(post_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the post'
            }), 400
        
        # Get the updated post
        updated_post = db.posts.find_one({'_id': ObjectId(post_id)})
        updated_post['_id'] = str(updated_post['_id'])
        updated_post['created_at'] = format_timestamp(updated_post['created_at'])
        updated_post['updated_at'] = format_timestamp(updated_post.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_post['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_post['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        return jsonify({
            'status': 'success',
            'message': 'Post updated successfully',
            'data': {
                'post': updated_post
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update post: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating post'
        }), 500

@social_feed_bp.route('/posts/<post_id>', methods=['DELETE'])
@token_required
@verification_required
def delete_post(post_id):
    """Delete a post"""
    try:
        db = get_db()
        
        # Find post by ID
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Check if user is the author of the post
        if post['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to delete this post'
            }), 403
        
        # Delete the post
        result = db.posts.delete_one({'_id': ObjectId(post_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'Failed to delete post'
            }), 500
        
        # Delete all comments associated with this post
        comments_deleted = db.comments.delete_many({'post_id': post_id})
        
        # Delete all likes associated with this post
        likes_deleted = db.post_likes.delete_many({'post_id': post_id})
        
        # Delete comment likes for comments that were deleted
        comment_likes_deleted = db.comment_likes.delete_many({'post_id': post_id})
        
        return jsonify({
            'status': 'success',
            'message': 'Post deleted successfully',
            'data': {
                'post_id': post_id,
                'comments_deleted': comments_deleted.deleted_count,
                'likes_deleted': likes_deleted.deleted_count,
                'comment_likes_deleted': comment_likes_deleted.deleted_count
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in delete post: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while deleting post'
        }), 500

@social_feed_bp.route('/posts/<post_id>/comments', methods=['GET'])
@token_required
@verification_required
def get_post_comments(post_id):
    """Get all comments for a post"""
    try:
        db = get_db()
        
        # Get all comments for the post
        comments = list(db.comments.find({'post_id': post_id}).sort('created_at', -1))
        
        # Process each comment
        for comment in comments:
            comment['_id'] = str(comment['_id'])
            comment['created_at'] = format_timestamp(comment['created_at'])
            
            # Get like count for the comment
            comment['like_count'] = db.comment_likes.count_documents({'comment_id': str(comment['_id'])})
            
            # Check if current user has liked the comment
            comment['is_liked'] = db.comment_likes.count_documents({
                'comment_id': str(comment['_id']),
                'user_id': str(g.user['_id'])
            }) > 0
            
            # Get author details
            try:
                author = db.users.find_one(
                    {'_id': ObjectId(comment['author_id'])},
                    {'password_hash': 0, 'verification': 0, 'notifications': 0}
                )
                
                if author:
                    comment['author'] = {
                        'id': str(author['_id']),
                        'username': author['username'],
                        'name': author['name'],
                        'profile_picture': author['profile_picture']
                    }
                else:
                    comment['author'] = {
                        'id': comment['author_id'],
                        'username': 'Unknown',
                        'name': 'Unknown User',
                        'profile_picture': None
                    }
            except Exception as author_error:
                logger.error(f"Error getting author details for comment {comment['_id']}: {str(author_error)}")
                comment['author'] = {
                    'id': comment['author_id'],
                    'username': 'Unknown',
                    'name': 'Unknown User',
                    'profile_picture': None
                }
        
        return jsonify({
            'status': 'success',
            'message': 'Comments retrieved successfully',
            'data': {
                'comments': comments
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting comments: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving comments'
        }), 500

@social_feed_bp.route('/posts/<post_id>/comments', methods=['POST'])
@token_required
@verification_required
def create_comment(post_id):
    """Create a new comment on a post with optional image and link"""
    try:
        # Check if the request contains files
        has_files = request.files and 'image' in request.files
        
        # Get comment data from form data or JSON
        if has_files:
            logger.info("Received comment with file upload")
            content = request.form.get('content')
            is_anonymous = request.form.get('is_anonymous', 'false').lower() == 'true'
            link = request.form.get('link')  # Optional link URL
        else:
            logger.info("Received comment without file upload")
            data = request.get_json()
            content = data.get('content')
            is_anonymous = data.get('is_anonymous', False)
            link = data.get('link')  # Optional link URL
        
        # Validate required fields
        if not content:
            return jsonify({
                'status': 'error',
                'message': 'Comment content is required'
            }), 400
        
        db = get_db()
        
        # Check if post exists
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Process uploaded image if present
        media_url = None
        if has_files:
            image_file = request.files['image']
            if image_file.filename != '':
                # Validate image file size (5MB limit)
                if len(image_file.read()) > 5 * 1024 * 1024:
                    return jsonify({
                        'status': 'error',
                        'message': 'Image file size should be less than 5MB'
                    }), 400
                image_file.seek(0)  # Reset file pointer after reading
                
                # Save the image using the helper function
                from app.routes.users import save_uploaded_image
                image_data = save_uploaded_image(image_file, folder='comment_images')
                if image_data:
                    media_url = image_data['file_url']
                    logger.info(f"Saved comment image: {media_url}")
        
        # Create new comment with UTC timezone
        now = datetime.now(timezone.utc)
        new_comment = {
            'post_id': post_id,
            'content': content,
            'author_id': str(g.user['_id']),
            'created_at': now,
            'updated_at': now,
            'is_anonymous': is_anonymous,
            'is_moderated': True,  # Auto-approve comments
            'moderation_status': 'approved',  # Auto-approve comments
            'moderation_feedback': None,
            'media_url': media_url,  # Add the image URL if present
            'link': link  # Add the link if present
        }
        
        result = db.comments.insert_one(new_comment)
        
        # Get the complete comment object to return
        created_comment = db.comments.find_one({'_id': result.inserted_id})
        created_comment['_id'] = str(created_comment['_id'])
        created_comment['created_at'] = format_timestamp(created_comment['created_at'])
        
        # Add author details
        author = db.users.find_one(
            {'_id': ObjectId(g.user['_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        created_comment['author'] = {
            'id': str(author['_id']),
            'username': author['username'],
            'name': author['name'],
            'profile_picture': author['profile_picture']
        }
        created_comment['like_count'] = 0
        created_comment['is_liked'] = False
        
        # Add notification for post author
        if post['author_id'] != str(g.user['_id']):
            notification = {
                'user_id': post['author_id'],
                'type': 'comment',
                'content': f"New comment on your post: '{post['title']}'",
                'reference_id': str(result.inserted_id),
                'post_id': post_id,
                'created_at': datetime.now(timezone.utc),
                'is_read': False
            }
            
            db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': 'Comment created successfully',
            'data': {
                'comment_id': str(result.inserted_id),
                'is_moderated': True,
                'comment': created_comment,
                'media_url': media_url,
                'link': link
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in create comment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while creating comment'
        }), 500

@social_feed_bp.route('/posts/<post_id>/like', methods=['POST'])
@token_required
@verification_required
def like_post(post_id):
    """Like or unlike a post"""
    try:
        db = get_db()
        
        # Check if post exists
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Check if user has already liked the post
        existing_like = db.post_likes.find_one({
            'post_id': post_id,
            'user_id': str(g.user['_id'])
        })
        
        if existing_like:
            # Unlike the post
            db.post_likes.delete_one({'_id': existing_like['_id']})
            
            return jsonify({
                'status': 'success',
                'message': 'Post unliked successfully',
                'data': {
                    'liked': False
                }
            }), 200
        else:
            # Like the post
            new_like = {
                'post_id': post_id,
                'user_id': str(g.user['_id']),
                'created_at': datetime.now(timezone.utc)
            }
            
            db.post_likes.insert_one(new_like)
            
            # Add notification for post author
            if post['author_id'] != str(g.user['_id']):
                notification = {
                    'user_id': post['author_id'],
                    'type': 'like',
                    'content': f"Someone liked your post: '{post['title']}'",
                    'reference_id': post_id,
                    'created_at': datetime.now(timezone.utc),
                    'is_read': False
                }
                
                db.notifications.insert_one(notification)
            
            return jsonify({
                'status': 'success',
                'message': 'Post liked successfully',
                'data': {
                    'liked': True
                }
            }), 200
        
    except Exception as e:
        logger.error(f"Error in like post: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while liking post'
        }), 500

@social_feed_bp.route('/comments/<comment_id>', methods=['PUT'])
@token_required
@verification_required
def update_comment(comment_id):
    """Update a comment"""
    try:
        db = get_db()
        
        # Find comment by ID
        comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        
        if not comment:
            return jsonify({
                'status': 'error',
                'message': 'Comment not found'
            }), 404
        
        # Check if user is the author of the comment
        if comment['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this comment'
            }), 403
        
        # Check if the request contains files
        has_files = request.files and 'image' in request.files
        
        # Get comment data from form data or JSON
        if has_files:
            logger.info("Received comment update with file upload")
            content = request.form.get('content')
            link = request.form.get('link')
            
            # Process uploaded image
            media_url = comment.get('media_url')  # Keep existing media URL
            
            image_file = request.files['image']
            if image_file.filename != '':
                # Validate image file size (5MB limit)
                if len(image_file.read()) > 5 * 1024 * 1024:
                    return jsonify({
                        'status': 'error',
                        'message': 'Image file size should be less than 5MB'
                    }), 400
                image_file.seek(0)  # Reset file pointer after reading
                
                # Save the image using the helper function
                from app.routes.users import save_uploaded_image
                image_data = save_uploaded_image(image_file, folder='comment_images')
                if image_data:
                    media_url = image_data['file_url']
                    logger.info(f"Saved comment image: {media_url}")
            
            # Update fields
            update_fields = {
                'content': content,
                'media_url': media_url,
                'updated_at': datetime.now(timezone.utc)
            }
            if link:
                update_fields['link'] = link
            elif link == '':  # Explicitly remove link if empty string
                update_fields['link'] = None
        else:
            logger.info("Received comment update without file upload")
            data = request.get_json()
            
            # Update fields
            update_fields = {
                'content': data.get('content'),
                'updated_at': datetime.now(timezone.utc)
            }
            
            # Handle link update
            if 'link' in data:
                update_fields['link'] = data['link'] if data['link'] else None
            
            # Keep existing media_url if not being updated
            if 'media_url' in data:
                update_fields['media_url'] = data['media_url']
        
        # Update comment
        result = db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the comment'
            }), 400
        
        # Get the updated comment
        updated_comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        updated_comment['_id'] = str(updated_comment['_id'])
        updated_comment['created_at'] = format_timestamp(updated_comment['created_at'])
        updated_comment['updated_at'] = format_timestamp(updated_comment.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_comment['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_comment['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        # Get like count and status
        updated_comment['like_count'] = db.comment_likes.count_documents({
            'comment_id': comment_id
        })
        
        updated_comment['is_liked'] = db.comment_likes.count_documents({
            'comment_id': comment_id,
            'user_id': str(g.user['_id'])
        }) > 0
        
        return jsonify({
            'status': 'success',
            'message': 'Comment updated successfully',
            'data': {
                'comment': updated_comment
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update comment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating comment'
        }), 500

@social_feed_bp.route('/comments/<comment_id>', methods=['DELETE'])
@token_required
@verification_required
def delete_comment(comment_id):
    """Delete a comment"""
    try:
        db = get_db()
        
        # Check if comment exists and user is the author
        comment = db.comments.find_one({
            '_id': ObjectId(comment_id),
            'author_id': str(g.user['_id'])
        })
        
        if not comment:
            return jsonify({
                'status': 'error',
                'message': 'Comment not found or you are not the author'
            }), 404
        
        # Get the post_id before deleting the comment
        post_id = comment.get('post_id')
        
        # Delete the comment
        result = db.comments.delete_one({'_id': ObjectId(comment_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'Failed to delete comment'
            }), 500
        
        # Delete any likes associated with the comment
        db.post_likes.delete_many({
            'comment_id': comment_id,
            'type': 'comment'
        })
        
        # Update the comment count on the post
        if post_id:
            db.posts.update_one(
                {'_id': ObjectId(post_id)},
                {'$inc': {'comment_count': -1}}
            )
        
        return jsonify({
            'status': 'success',
            'message': 'Comment deleted successfully',
            'data': {
                'comment_id': comment_id,
                'post_id': post_id
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting comment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while deleting comment'
        }), 500

@social_feed_bp.route('/comments/<comment_id>/like', methods=['POST'])
@token_required
@verification_required
def like_comment(comment_id):
    """Toggle like status for a comment"""
    try:
        db = get_db()
        
        # Check if comment exists
        comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        if not comment:
            return jsonify({
                'status': 'error',
                'message': 'Comment not found'
            }), 404
            
        user_id = str(g.user['_id'])
        
        # Check if user has already liked the comment
        existing_like = db.comment_likes.find_one({
            'comment_id': comment_id,
            'user_id': user_id
        })
        
        if existing_like:
            # Unlike: Remove the like
            db.comment_likes.delete_one({
                'comment_id': comment_id,
                'user_id': user_id
            })
            like_action = 'unliked'
        else:
            # Like: Add new like
            db.comment_likes.insert_one({
                'comment_id': comment_id,
                'user_id': user_id,
                'created_at': datetime.now(timezone.utc)
            })
            like_action = 'liked'
            
        # Get updated like count
        like_count = db.comment_likes.count_documents({'comment_id': comment_id})
        
        # Get updated comment with like status
        updated_comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        if updated_comment:
            updated_comment['_id'] = str(updated_comment['_id'])
            updated_comment['created_at'] = format_timestamp(updated_comment['created_at'])
            updated_comment['like_count'] = like_count
            updated_comment['is_liked'] = not existing_like  # Toggle the like status
            
            # Get author details
            author = db.users.find_one(
                {'_id': ObjectId(updated_comment['author_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            if author:
                updated_comment['author'] = {
                    'id': str(author['_id']),
                    'username': author['username'],
                    'name': author['name'],
                    'profile_picture': author['profile_picture']
                }
            
            # Add media_url and link if they exist
            updated_comment['media_url'] = updated_comment.get('media_url')
            updated_comment['link'] = updated_comment.get('link')
        
        return jsonify({
            'status': 'success',
            'message': f'Comment {like_action} successfully',
            'data': {
                'comment': updated_comment
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in like comment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while processing the like'
        }), 500

@social_feed_bp.route('/posts/<post_id>/text', methods=['PUT'])
@token_required
@verification_required
def update_post_text(post_id):
    """Update only the text content of a post"""
    try:
        db = get_db()
        
        # Find post by ID
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Check if user is the author of the post
        if post['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this post'
            }), 403
        
        data = request.get_json()
        content = data.get('content')
        
        if not content:
            return jsonify({
                'status': 'error',
                'message': 'Content is required'
            }), 400
        
        # Update only the content and sentiment
        update_fields = {
            'content': content,
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Update sentiment if content has changed
        if content != post.get('content'):
            try:
                sentiment_result = analyze_post_sentiment(content)
                update_fields.update({
                    'sentiment': sentiment_result['sentiment'],
                    'sentiment_score': sentiment_result['score'],
                    'emotional_intensity': sentiment_result['emotionalIntensity'],
                    'detected_emotions': sentiment_result['detectedEmotions']
                })
            except Exception as e:
                logger.error(f"Error analyzing sentiment during text update: {str(e)}")
                # Keep existing sentiment values if analysis fails
                update_fields.update({
                    'sentiment': post.get('sentiment', 'Neutral'),
                    'sentiment_score': post.get('sentiment_score', 50),
                    'emotional_intensity': post.get('emotional_intensity', 5),
                    'detected_emotions': post.get('detected_emotions', [{'name': 'Calmness', 'percentage': 50}])
                })
        
        # Update post
        result = db.posts.update_one(
            {'_id': ObjectId(post_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the post'
            }), 400
        
        # Get the updated post
        updated_post = db.posts.find_one({'_id': ObjectId(post_id)})
        updated_post['_id'] = str(updated_post['_id'])
        updated_post['created_at'] = format_timestamp(updated_post['created_at'])
        updated_post['updated_at'] = format_timestamp(updated_post.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_post['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_post['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        return jsonify({
            'status': 'success',
            'message': 'Post text updated successfully',
            'data': {
                'post': updated_post
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update post text: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating post text'
        }), 500

@social_feed_bp.route('/posts/<post_id>/media', methods=['PUT'])
@token_required
@verification_required
def update_post_media(post_id):
    """Update only the media (image/document) of a post"""
    try:
        db = get_db()
        
        # Find post by ID
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Check if user is the author of the post
        if post['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this post'
            }), 403
        
        # Check if the request contains files
        if not request.files or ('image' not in request.files and 'attachment' not in request.files):
            return jsonify({
                'status': 'error',
                'message': 'No media file provided'
            }), 400
        
        # Initialize media_urls as empty list since we're replacing media
        media_items = []
        
        # Handle image upload
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename != '':
                # Validate image file size (10MB limit)
                if len(image_file.read()) > 10 * 1024 * 1024:
                    return jsonify({
                        'status': 'error',
                        'message': 'Image file size should be less than 10MB'
                    }), 400
                image_file.seek(0)  # Reset file pointer after reading
                
                # Save the image using the helper function from users.py
                from app.routes.users import save_uploaded_image
                image_data = save_uploaded_image(image_file, folder='post_images')
                if image_data:
                    # Add more metadata for the frontend to properly handle the file
                    media_item = {
                        'url': image_data['file_url'],
                        'type': 'image',
                        'filename': image_data['original_filename'],
                        'content_type': image_data['content_type'],
                        'is_image': True
                    }
                    media_items.append(media_item)
                    logger.info(f"Saved post image: {image_data['file_url']}")
        
        # Handle attachment upload
        if 'attachment' in request.files:
            attachment_file = request.files['attachment']
            if attachment_file.filename != '':
                # Validate attachment file size (25MB limit)
                if len(attachment_file.read()) > 25 * 1024 * 1024:
                    return jsonify({
                        'status': 'error',
                        'message': 'Attachment file size should be less than 25MB'
                    }), 400
                attachment_file.seek(0)  # Reset file pointer after reading
                
                # Save the attachment
                from app.routes.users import save_uploaded_image
                attachment_data = save_uploaded_image(attachment_file, folder='post_attachments')
                if attachment_data:
                    # Add more metadata for the frontend to properly handle the file
                    media_item = {
                        'url': attachment_data['file_url'],
                        'type': 'document',
                        'filename': attachment_data['original_filename'],
                        'content_type': attachment_data['content_type'],
                        'is_image': False
                    }
                    media_items.append(media_item)
                    logger.info(f"Saved post attachment: {attachment_data['file_url']}")
        
        # Update only the media_urls
        update_fields = {
            'media_items': media_items,
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Update post
        result = db.posts.update_one(
            {'_id': ObjectId(post_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the post'
            }), 400
        
        # Get the updated post
        updated_post = db.posts.find_one({'_id': ObjectId(post_id)})
        updated_post['_id'] = str(updated_post['_id'])
        updated_post['created_at'] = format_timestamp(updated_post['created_at'])
        updated_post['updated_at'] = format_timestamp(updated_post.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_post['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_post['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        return jsonify({
            'status': 'success',
            'message': 'Post media updated successfully',
            'data': {
                'post': updated_post
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update post media: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating post media'
        }), 500

@social_feed_bp.route('/posts/<post_id>/remove-media', methods=['DELETE'])
@token_required
@verification_required
def remove_post_media(post_id):
    """Remove all media from a post"""
    try:
        db = get_db()
        
        # Find post by ID
        post = db.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
        
        # Check if user is the author of the post
        if post['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this post'
            }), 403
        
        # Update to remove all media
        update_fields = {
            'media_items': [],
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Update post
        result = db.posts.update_one(
            {'_id': ObjectId(post_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the post'
            }), 400
        
        # Get the updated post
        updated_post = db.posts.find_one({'_id': ObjectId(post_id)})
        updated_post['_id'] = str(updated_post['_id'])
        updated_post['created_at'] = format_timestamp(updated_post['created_at'])
        updated_post['updated_at'] = format_timestamp(updated_post.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_post['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_post['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        return jsonify({
            'status': 'success',
            'message': 'Post media removed successfully',
            'data': {
                'post': updated_post
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in remove post media: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while removing post media'
        }), 500

@social_feed_bp.route('/comments/<comment_id>/text', methods=['PUT'])
@token_required
@verification_required
def update_comment_text(comment_id):
    """Update only the text content of a comment"""
    try:
        db = get_db()
        
        # Find comment by ID
        comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        
        if not comment:
            return jsonify({
                'status': 'error',
                'message': 'Comment not found'
            }), 404
        
        # Check if user is the author of the comment
        if comment['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this comment'
            }), 403
        
        data = request.get_json()
        content = data.get('content')
        
        if not content:
            return jsonify({
                'status': 'error',
                'message': 'Content is required'
            }), 400
        
        # Update only the content
        update_fields = {
            'content': content,
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Update comment
        result = db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the comment'
            }), 400
        
        # Get the updated comment
        updated_comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        updated_comment['_id'] = str(updated_comment['_id'])
        updated_comment['created_at'] = format_timestamp(updated_comment['created_at'])
        updated_comment['updated_at'] = format_timestamp(updated_comment.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_comment['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_comment['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        # Get like count and status
        updated_comment['like_count'] = db.comment_likes.count_documents({
            'comment_id': comment_id
        })
        
        updated_comment['is_liked'] = db.comment_likes.count_documents({
            'comment_id': comment_id,
            'user_id': str(g.user['_id'])
        }) > 0
        
        return jsonify({
            'status': 'success',
            'message': 'Comment text updated successfully',
            'data': {
                'comment': updated_comment
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update comment text: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating comment text'
        }), 500

@social_feed_bp.route('/comments/<comment_id>/media', methods=['PUT'])
@token_required
@verification_required
def update_comment_media(comment_id):
    """Update only the media (image) of a comment"""
    try:
        db = get_db()
        
        # Find comment by ID
        comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        
        if not comment:
            return jsonify({
                'status': 'error',
                'message': 'Comment not found'
            }), 404
        
        # Check if user is the author of the comment
        if comment['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this comment'
            }), 403
        
        # Check if the request contains files
        if not request.files or 'image' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No image file provided'
            }), 400
        
        # Process uploaded image
        media_url = None
        image_file = request.files['image']
        if image_file.filename != '':
            # Validate image file size (5MB limit)
            if len(image_file.read()) > 5 * 1024 * 1024:
                return jsonify({
                    'status': 'error',
                    'message': 'Image file size should be less than 5MB'
                }), 400
            image_file.seek(0)  # Reset file pointer after reading
            
            # Save the image using the helper function
            from app.routes.users import save_uploaded_image
            image_data = save_uploaded_image(image_file, folder='comment_images')
            if image_data:
                media_url = image_data['file_url']
                logger.info(f"Saved comment image: {media_url}")
        
        # Update only the media_url
        update_fields = {
            'media_url': media_url,
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Update comment
        result = db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the comment'
            }), 400
        
        # Get the updated comment
        updated_comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        updated_comment['_id'] = str(updated_comment['_id'])
        updated_comment['created_at'] = format_timestamp(updated_comment['created_at'])
        updated_comment['updated_at'] = format_timestamp(updated_comment.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_comment['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_comment['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        # Get like count and status
        updated_comment['like_count'] = db.comment_likes.count_documents({
            'comment_id': comment_id
        })
        
        updated_comment['is_liked'] = db.comment_likes.count_documents({
            'comment_id': comment_id,
            'user_id': str(g.user['_id'])
        }) > 0
        
        return jsonify({
            'status': 'success',
            'message': 'Comment media updated successfully',
            'data': {
                'comment': updated_comment
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update comment media: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating comment media'
        }), 500

@social_feed_bp.route('/comments/<comment_id>/link', methods=['PUT'])
@token_required
@verification_required
def update_comment_link(comment_id):
    """Update only the link of a comment"""
    try:
        db = get_db()
        
        # Find comment by ID
        comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        
        if not comment:
            return jsonify({
                'status': 'error',
                'message': 'Comment not found'
            }), 404
        
        # Check if user is the author of the comment
        if comment['author_id'] != str(g.user['_id']):
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this comment'
            }), 403
        
        data = request.get_json()
        link = data.get('link')
        
        # Update only the link
        update_fields = {
            'link': link if link else None,
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Update comment
        result = db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the comment'
            }), 400
        
        # Get the updated comment
        updated_comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        updated_comment['_id'] = str(updated_comment['_id'])
        updated_comment['created_at'] = format_timestamp(updated_comment['created_at'])
        updated_comment['updated_at'] = format_timestamp(updated_comment.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_comment['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_comment['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        # Get like count and status
        updated_comment['like_count'] = db.comment_likes.count_documents({
            'comment_id': comment_id
        })
        
        updated_comment['is_liked'] = db.comment_likes.count
        result = db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the comment'
            }), 400
        
        # Get the updated comment
        updated_comment = db.comments.find_one({'_id': ObjectId(comment_id)})
        updated_comment['_id'] = str(updated_comment['_id'])
        updated_comment['created_at'] = format_timestamp(updated_comment['created_at'])
        updated_comment['updated_at'] = format_timestamp(updated_comment.get('updated_at'))
        
        # Get author details
        author = db.users.find_one(
            {'_id': ObjectId(updated_comment['author_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if author:
            updated_comment['author'] = {
                'id': str(author['_id']),
                'username': author['username'],
                'name': author['name'],
                'profile_picture': author['profile_picture']
            }
        
        # Get like count and status
        updated_comment['like_count'] = db.comment_likes.count_documents({
            'comment_id': comment_id
        })
        
        updated_comment['is_liked'] = db.comment_likes.count_documents({
            'comment_id': comment_id,
            'user_id': str(g.user['_id'])
        }) > 0
        
        return jsonify({
            'status': 'success',
            'message': 'Comment media removed successfully',
            'data': {
                'comment': updated_comment
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in remove comment media: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while removing comment media'
        }), 500

# Helper function to analyze sentiment of post content
def analyze_post_sentiment(text):
    """Analyze the sentiment of post content using Hugging Face API"""
    try:
        # Check if text is empty or too short
        if not text or len(text.strip()) < 3:
            logger.warning("Text too short for sentiment analysis, returning Neutral")
            return {
                'score': 50,
                'sentiment': 'Neutral',
                'emotionalIntensity': 3,
                'detectedEmotions': [{'name': 'Calmness', 'percentage': 50}]
            }
            
        # First, try using the Hugging Face Inference API (faster and more reliable)
        import os
        import requests
        from dotenv import load_dotenv
        
        # Load environment variables if not already loaded
        load_dotenv()
        
        # Get API key from environment variables
        api_key = os.getenv('AI_API_KEY')
        
        if api_key:
            logger.info("Using Hugging Face Inference API for sentiment analysis")
            
            # API endpoint for the model
            API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment"
            
            # Set up headers with the API key
            headers = {"Authorization": f"Bearer {api_key}"}
            
            # Prepare the payload
            payload = {"inputs": text}
            
            # Make the API request
            response = requests.post(API_URL, headers=headers, json=payload)
            
            # Check if the request was successful
            if response.status_code == 200:
                result = response.json()
                
                # The API returns a list of dictionaries with label and score
                # Find the label with the highest score
                if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
                    # Get the item with highest score
                    best_match = max(result[0], key=lambda x: x['score'])
                    raw_sentiment = best_match['label']
                    confidence = best_match['score']
                    
                    logger.info(f"API returned sentiment: {raw_sentiment} with confidence: {confidence}")
                else:
                    raise ValueError(f"Unexpected API response format: {result}")
            else:
                # If API call fails, fall back to local model
                logger.warning(f"API call failed with status {response.status_code}: {response.text}")
                raise ValueError("API call failed, falling back to local model")
        else:
            # No API key, use local model
            logger.warning("No API key found, using local model")
            raise ValueError("No API key, falling back to local model")
                
    except Exception as api_error:
        # Fall back to local model if API call fails
        logger.warning(f"API approach failed, falling back to local model: {str(api_error)}")
        
        try:
            # Import the necessary libraries for local processing
            from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
            import torch
            
            # Use direct text classification with explicit labels
            logger.info("Using local model for sentiment analysis")
            
            # Initialize the pipeline with specific parameters
            sentiment_pipeline = pipeline(
                "text-classification", 
                model="cardiffnlp/twitter-roberta-base-sentiment",
                return_all_scores=True  # Get scores for all labels
            )
            
            # Process the text
            result = sentiment_pipeline(text)
            
            # Find the label with the highest score
            if result and isinstance(result[0], list):
                best_match = max(result[0], key=lambda x: x['score'])
                raw_sentiment = best_match['label']
                confidence = best_match['score']
            else:
                # Fallback if result format is unexpected
                logger.warning(f"Unexpected pipeline result format: {result}")
                # Try to extract the highest scoring label
                if result and isinstance(result[0], dict) and 'label' in result[0]:
                    raw_sentiment = result[0]['label']
                    confidence = result[0]['score']
                else:
                    raise ValueError(f"Could not extract sentiment from result: {result}")
            
            logger.info(f"Local model returned sentiment: {raw_sentiment} with confidence: {confidence}")
            
        except Exception as local_model_error:
            logger.error(f"Local model failed: {str(local_model_error)}")
            
            # As a last resort, use a simple rule-based approach
            logger.warning("Falling back to rule-based sentiment analysis")
            
            # Simple word lists for basic sentiment analysis
            positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'joy', 'love', 'like', 'best']
            negative_words = ['bad', 'terrible', 'awful', 'horrible', 'sad', 'angry', 'hate', 'dislike', 'worst']
            
            text_lower = text.lower()
            pos_count = sum(1 for word in positive_words if word in text_lower)
            neg_count = sum(1 for word in negative_words if word in text_lower)
            
            # Determine sentiment based on word counts
            if pos_count > neg_count:
                raw_sentiment = "POSITIVE"
                confidence = min(0.9, 0.5 + (pos_count - neg_count) * 0.1)
            elif neg_count > pos_count:
                raw_sentiment = "NEGATIVE"
                confidence = min(0.9, 0.5 + (neg_count - pos_count) * 0.1)
            else:
                # If counts are equal or both zero, check for specific phrases
                if any(phrase in text_lower for phrase in ['thank you', 'thanks', 'appreciate']):
                    raw_sentiment = "POSITIVE"
                    confidence = 0.7
                elif any(phrase in text_lower for phrase in ['sorry', 'apologize', 'regret']):
                    raw_sentiment = "NEGATIVE"
                    confidence = 0.7
                else:
                    raw_sentiment = "NEUTRAL"
                    confidence = 0.6
            
            logger.info(f"Rule-based analysis returned: {raw_sentiment} with confidence: {confidence}")
    
    # Map the model's output to our application's format
    # The model returns labels like: LABEL_0, LABEL_1, LABEL_2 or NEGATIVE, NEUTRAL, POSITIVE
    sentiment_mapping = {
        "LABEL_0": "Negative",
        "LABEL_1": "Neutral", 
        "LABEL_2": "Positive",
        "NEGATIVE": "Negative",
        "NEUTRAL": "Neutral", 
        "POSITIVE": "Positive"
    }
    
    # Default to the raw sentiment if it's already in the right format
    sentiment = sentiment_mapping.get(raw_sentiment, raw_sentiment)
    
    # Make sure we have a valid sentiment category
    if sentiment not in ["Positive", "Neutral", "Negative"]:
        logger.warning(f"Unknown sentiment '{sentiment}', defaulting to Neutral")
        sentiment = "Neutral"
    
    # Convert confidence to percentage score
    score_percentage = round(confidence * 100)
    
    # Determine emotional intensity (1-10 scale) based on confidence
    emotional_intensity = max(1, min(10, round(confidence * 10)))
    
    # Generate detected emotions based on the sentiment
    detected_emotions = []
    
    if sentiment == "Positive":
        detected_emotions.append({"name": "Happiness", "percentage": score_percentage})
        if score_percentage > 80:
            detected_emotions.append({"name": "Joy", "percentage": score_percentage - 10})
    elif sentiment == "Negative":
        detected_emotions.append({"name": "Sadness", "percentage": score_percentage})
        if score_percentage > 75:
            detected_emotions.append({"name": "Anger", "percentage": score_percentage - 15})
    else:  # Neutral
        detected_emotions.append({"name": "Calmness", "percentage": score_percentage})
    
    logger.info(f"Final sentiment analysis for text: '{text[:30]}...' - Result: {sentiment} (Score: {score_percentage}%)")
    
    return {
        'score': score_percentage,
        'sentiment': sentiment,
        'emotionalIntensity': emotional_intensity,
        'detectedEmotions': detected_emotions
    }

def format_timestamp(dt):
    """Helper function to format timestamps consistently"""
    if not dt:
        return None
    # Convert to UTC if it has a different timezone
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc)
    # If no timezone info, assume it's UTC
    else:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.replace(microsecond=0).isoformat()
