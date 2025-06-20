# app/routes/resources.py

from flask import Blueprint, request, jsonify, g, current_app, send_file, make_response
from app.db import get_db, get_file_from_gridfs, delete_file_from_gridfs
from datetime import datetime, timezone
from bson import ObjectId
import logging
import os
import uuid
import mimetypes
from werkzeug.utils import secure_filename
from io import BytesIO
from app.routes.users import token_required, verification_required

logger = logging.getLogger(__name__)

resources_bp = Blueprint('resources', __name__, url_prefix='/api/resources')

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

# Helper function to check if file extension is allowed
def allowed_file(filename, allowed_extensions=None):
    """Check if file extension is allowed"""
    if not allowed_extensions:
        # Use resource extensions by default
        allowed_extensions = current_app.config['ALLOWED_RESOURCE_EXTENSIONS']
    
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

# Helper function to create upload directory if it doesn't exist
def ensure_upload_dir(directory):
    """Create upload directory if it doesn't exist"""
    if not os.path.exists(directory):
        os.makedirs(directory)

@resources_bp.route('/upload', methods=['POST'])
@token_required
@verification_required
def upload_resource():
    """Upload a new resource file"""
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file part in the request'
            }), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
        
        # Check if file extension is allowed
        if not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': f'File type not allowed. Allowed types: {", ".join(current_app.config["ALLOWED_RESOURCE_EXTENSIONS"])}'
            }), 400
            
        # Check file size
        file_size = len(file.read())
        file.seek(0)  # Reset file pointer after reading
        
        if file_size > current_app.config['MAX_RESOURCE_SIZE']:
            return jsonify({
                'status': 'error',
                'message': f'File size should be less than {current_app.config["MAX_RESOURCE_SIZE"] // (1024 * 1024)}MB'
            }), 400
        
        # Get form data
        title = request.form.get('title')
        description = request.form.get('description', '')
        subject = request.form.get('subject')
        semester = request.form.get('semester')
        resource_type = request.form.get('type')
        tags = request.form.get('tags', '').split(',') if request.form.get('tags') else []
        
        # Validate required fields
        if not title or not subject or not semester or not resource_type:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: title, subject, semester, and type are required'
            }), 400
        
        # Create a secure filename
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        
        # Save file to GridFS
        from app.db import save_file_to_gridfs
        file_content = file.read()
        content_type = file.content_type if hasattr(file, 'content_type') else f'application/{file_extension}'
        
        file_id = save_file_to_gridfs(file_content, unique_filename, content_type)
        
        # Create resource record in database
        db = get_db()
        
        new_resource = {
            'title': title,
            'description': description,
            'subject': subject,
            'semester': semester,
            'type': resource_type,
            'tags': tags,
            'filename': unique_filename,
            'original_filename': filename,
            'file_extension': file_extension,
            'file_size': file_size,
            'file_id': str(file_id),  # Store GridFS file ID
            'uploader_id': str(g.user['_id']),
            'created_at': datetime.now(timezone.utc),
            'upvotes': 0,
            'downvotes': 0,
            'download_count': 0,
            'is_verified': True  # Resources are verified by default since user is already verified
        }
        
        result = db.resources.insert_one(new_resource)
        
        return jsonify({
            'status': 'success',
            'message': 'Resource uploaded successfully',
            'data': {
                'resource_id': str(result.inserted_id)
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in upload resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while uploading resource'
        }), 500

@resources_bp.route('', methods=['GET'])
@token_required
@verification_required
def get_resources():
    """Get all resources with optional filtering"""
    try:
        # Get query parameters
        subject = request.args.get('subject')
        semester = request.args.get('semester')
        resource_type = request.args.get('type')
        search = request.args.get('search')
        tags = request.args.get('tags')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = int(request.args.get('sort_order', -1))  # -1 for descending, 1 for ascending
        limit = int(request.args.get('limit', 20))
        skip = int(request.args.get('skip', 0))
        
        # Build query
        query = {}
        
        if subject:
            query['subject'] = subject
        
        if semester:
            query['semester'] = semester
        
        if resource_type:
            query['type'] = resource_type
        
        if tags:
            tags_list = [tag.strip() for tag in tags.split(',')]
            query['tags'] = {'$in': tags_list}
        
        if search:
            query['$or'] = [
                {'title': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'tags': {'$regex': search, '$options': 'i'}}
            ]
        
        db = get_db()
        
        # Get resources from database
        resources = list(db.resources.find(query).sort(sort_by, sort_order).skip(skip).limit(limit))
        
        # Process resources
        for resource in resources:
            resource['_id'] = str(resource['_id'])
            resource['created_at'] = format_timestamp(resource['created_at'])
            
            # Get uploader details
            uploader = db.users.find_one(
                {'_id': ObjectId(resource['uploader_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            
            if uploader:
                resource['uploader'] = {
                    'id': str(uploader['_id']),
                    'username': uploader['username'],
                    'name': uploader['name'],
                    'profile_picture': uploader['profile_picture']
                }
            
            # Check if current user has upvoted the resource
            resource['user_vote'] = 'none'
            upvote = db.resource_votes.find_one({
                'resource_id': resource['_id'],
                'user_id': str(g.user['_id'])
            })
            
            if upvote:
                resource['user_vote'] = upvote['vote_type']
        
        # Get total count
        total_count = db.resources.count_documents(query)
        
        return jsonify({
            'status': 'success',
            'data': {
                'resources': resources,
                'total_count': total_count,
                'has_more': total_count > skip + limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get resources: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving resources'
        }), 500

@resources_bp.route('/<resource_id>/like', methods=['POST'])
@token_required
@verification_required
def like_resource(resource_id):
    """Like a resource"""
    try:
        db = get_db()
        
        # Check if resource exists
        resource = db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource:
            return jsonify({
                'status': 'error',
                'message': 'Resource not found'
            }), 404
        
        # Check if user has already liked this resource
        like = db.resource_likes.find_one({
            'resource_id': resource_id,
            'user_id': str(g.user['_id'])
        })
        
        if like:
            # User already liked this resource, remove the like (toggle)
            db.resource_likes.delete_one({'_id': like['_id']})
            db.resources.update_one(
                {'_id': ObjectId(resource_id)},
                {'$inc': {'upvotes': -1}}
            )
            is_upvoted = False
        else:
            # User hasn't liked this resource yet, add the like
            db.resource_likes.insert_one({
                'resource_id': resource_id,
                'user_id': str(g.user['_id']),
                'created_at': datetime.now(timezone.utc)
            })
            db.resources.update_one(
                {'_id': ObjectId(resource_id)},
                {'$inc': {'upvotes': 1}}
            )
            is_upvoted = True
        
        # Get updated upvote count
        updated_resource = db.resources.find_one({'_id': ObjectId(resource_id)})
        
        return jsonify({
            'status': 'success',
            'message': 'Resource like toggled successfully',
            'data': {
                'upvotes': updated_resource['upvotes'],
                'is_upvoted': is_upvoted
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"Error in like resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while liking resource'
        }), 500

@resources_bp.route('/<resource_id>/download', methods=['GET', 'POST'])
def get_resource_download(resource_id):
    """Download a resource file and increment download count"""
    try:
        db = get_db()
        
        # Check if resource exists
        resource = db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource:
            return jsonify({
                'status': 'error',
                'message': 'Resource not found'
            }), 404
        
        # Increment download count
        db.resources.update_one(
            {'_id': ObjectId(resource_id)},
            {'$inc': {'download_count': 1}}
        )
        
        # If it's a POST request, just increment the counter and return success
        if request.method == 'POST':
            return jsonify({
                'status': 'success',
                'message': 'Download count incremented',
                'data': {
                    'download_count': resource['download_count'] + 1
                }
            }), 200
        
        # For GET requests, serve the file
        file_path = os.path.join(
            current_app.config.get('UPLOAD_FOLDER', 'uploads'),
            'resources',
            resource['filename']
        )
        
        if not os.path.exists(file_path):
            return jsonify({
                'status': 'error',
                'message': 'File not found on server'
            }), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=resource['original_filename']
        )
        
    except Exception as e:
        logger.error(f"Error in download resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while downloading resource'
        }), 500

@resources_bp.route('/<resource_id>', methods=['GET'])
@token_required
@verification_required
def get_resource(resource_id):
    """Get a specific resource"""
    try:
        db = get_db()
        
        # Find resource by ID
        resource = db.resources.find_one({'_id': ObjectId(resource_id)})
        
        if not resource:
            return jsonify({
                'status': 'error',
                'message': 'Resource not found'
            }), 404
        
        # Convert ObjectId to string
        resource['_id'] = str(resource['_id'])
        resource['created_at'] = format_timestamp(resource['created_at'])
        
        # Get uploader details
        uploader = db.users.find_one(
            {'_id': ObjectId(resource['uploader_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if uploader:
            resource['uploader'] = {
                'id': str(uploader['_id']),
                'username': uploader['username'],
                'name': uploader['name'],
                'profile_picture': uploader['profile_picture']
            }
        
        # Check if current user has upvoted the resource
        resource['user_vote'] = 'none'
        upvote = db.resource_votes.find_one({
            'resource_id': resource_id,
            'user_id': str(g.user['_id'])
        })
        
        if upvote:
            resource['user_vote'] = upvote['vote_type']
        
        return jsonify({
            'status': 'success',
            'data': resource
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving resource'
        }), 500

@resources_bp.route('/<resource_id>/download', methods=['GET'])
@token_required
@verification_required
def download_resource(resource_id):
    """Download a resource file"""
    try:
        # Log the download request for debugging
        logger.info(f"Resource download requested for ID: {resource_id}")
        
        db = get_db()
        
        # Find resource by ID
        try:
            # Remove any whitespace and handle potential encoding issues
            resource_id = resource_id.strip()
            resource = db.resources.find_one({'_id': ObjectId(resource_id)})
            logger.info(f"Resource found: {resource is not None}")
        except Exception as e:
            logger.error(f"Invalid ObjectId format for resource_id: {resource_id}, Error: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid resource identifier'
            }), 400
        
        if not resource:
            logger.error(f"Resource not found with ID: {resource_id}")
            return jsonify({
                'status': 'error',
                'message': 'Resource not found'
            }), 404
        
        # Check if resource has a file_id (new method)
        if 'file_id' in resource and resource['file_id']:                # Use GridFS to serve the file directly
            from app.db import get_file_from_gridfs
            
            # Log the file_id for debugging
            logger.info(f"Attempting to retrieve file with ID: {resource['file_id']}")
            
            # Convert string ID to ObjectId if needed 
            file_id = resource['file_id']
            if isinstance(file_id, str):
                try:
                    file_id = ObjectId(file_id)
                except Exception as e:
                    logger.error(f"Invalid ObjectId format for file_id: {file_id}, Error: {str(e)}")
                    return jsonify({
                        'status': 'error',
                        'message': 'Invalid file identifier'
                    }), 400
            
            # Get file from GridFS
            gridfs_file = get_file_from_gridfs(file_id)
            
            if not gridfs_file:
                logger.error(f"File not found in GridFS with ID: {file_id}")
                return jsonify({
                    'status': 'error',
                    'message': 'File not found on server'
                }), 404
            
            # Increment download count
            db.resources.update_one(
                {'_id': ObjectId(resource_id)},
                {'$inc': {'download_count': 1}}
            )
            
            try:
                # Create file-like object
                file_data = BytesIO(gridfs_file.read())
                logger.info(f"Successfully read file data from GridFS, size: {len(file_data.getvalue())} bytes")
                
                # Reset position to beginning of file for reading
                file_data.seek(0)
                
                # Get content type and filename
                content_type = gridfs_file.content_type or 'application/octet-stream'
                download_name = resource.get('original_filename', gridfs_file.filename)
                
                logger.info(f"Sending file: {download_name}, content-type: {content_type}")
                
                # Create response with file download
                response = send_file(
                    file_data, 
                    mimetype=content_type,
                    as_attachment=True, 
                    download_name=download_name
                )
                
                # Add CORS headers
                response.headers['Access-Control-Allow-Origin'] = '*'
                
                # Log success
                logger.info(f"File response created successfully for {download_name}")
                return response
                
            except Exception as e:
                logger.error(f"Error sending GridFS file: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())  # Log full traceback
                return jsonify({
                    'status': 'error',
                    'message': f'Error preparing file for download: {str(e)}'
                }), 500
        
        # Legacy method (local filesystem) - for backward compatibility
        else:
            # Check if the resource has a filename
            if not resource.get('filename'):
                return jsonify({
                    'status': 'error',
                    'message': 'Resource file information is missing'
                }), 404
                
            # Get file path
            upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'resources')
            file_path = os.path.join(upload_dir, resource['filename'])
            
            # Check if file exists
            if not os.path.exists(file_path):
                logger.error(f"Resource file not found at path: {file_path}")
                return jsonify({
                    'status': 'error',
                    'message': 'Resource file not found on server'
                }), 404
            
            try:
                # Increment download count
                db.resources.update_one(
                    {'_id': ObjectId(resource_id)},
                    {'$inc': {'download_count': 1}}
                )
                
                # Determine content type based on file extension
                file_extension = os.path.splitext(file_path)[1].lower()[1:]
                content_type = None
                if file_extension:
                    if file_extension in ['pdf']:
                        content_type = f'application/pdf'
                    elif file_extension in ['doc', 'docx']:
                        content_type = 'application/msword'
                    elif file_extension in ['xls', 'xlsx']:
                        content_type = 'application/vnd.ms-excel'
                    elif file_extension in ['ppt', 'pptx']:
                        content_type = 'application/vnd.ms-powerpoint'
                    elif file_extension in ['zip']:
                        content_type = 'application/zip'
                    elif file_extension in ['txt']:
                        content_type = 'text/plain'
                
                # Return file
                return send_file(
                    file_path,
                    mimetype=content_type,
                    as_attachment=True,
                    download_name=resource.get('original_filename', os.path.basename(file_path))
                )
            
            except Exception as e:
                logger.error(f"Error sending file: {str(e)}")
                return jsonify({
                    'status': 'error',
                    'message': f'Error preparing file for download: {str(e)}'
                }), 500
        
    except Exception as e:
        logger.error(f"Error in download resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while downloading resource'
        }), 500

@resources_bp.route('/<resource_id>/vote', methods=['POST'])
@token_required
@verification_required
def vote_resource(resource_id):
    """Upvote or downvote a resource"""
    try:
        data = request.get_json()
        
        # Validate vote type
        if 'vote_type' not in data or data['vote_type'] not in ['upvote', 'downvote', 'none']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid vote type. Must be one of: upvote, downvote, none'
            }), 400
        
        db = get_db()
        
        # Find resource by ID
        resource = db.resources.find_one({'_id': ObjectId(resource_id)})
        
        if not resource:
            return jsonify({
                'status': 'error',
                'message': 'Resource not found'
            }), 404
        
        # Check if user has already voted
        existing_vote = db.resource_votes.find_one({
            'resource_id': resource_id,
            'user_id': str(g.user['_id'])
        })
        
        # Handle vote
        if existing_vote:
            # Remove existing vote
            if existing_vote['vote_type'] == 'upvote':
                db.resources.update_one(
                    {'_id': ObjectId(resource_id)},
                    {'$inc': {'upvotes': -1}}
                )
            elif existing_vote['vote_type'] == 'downvote':
                db.resources.update_one(
                    {'_id': ObjectId(resource_id)},
                    {'$inc': {'downvotes': -1}}
                )
            
            # If new vote is 'none', delete the vote
            if data['vote_type'] == 'none':
                db.resource_votes.delete_one({'_id': existing_vote['_id']})
                
                return jsonify({
                    'status': 'success',
                    'message': 'Vote removed successfully'
                }), 200
            else:
                # Update vote
                db.resource_votes.update_one(
                    {'_id': existing_vote['_id']},
                    {'$set': {'vote_type': data['vote_type']}}
                )
        else:
            # Create new vote
            if data['vote_type'] != 'none':
                new_vote = {
                    'resource_id': resource_id,
                    'user_id': str(g.user['_id']),
                    'vote_type': data['vote_type'],
                    'created_at': datetime.now(timezone.utc)
                }
                
                db.resource_votes.insert_one(new_vote)
            else:
                return jsonify({
                    'status': 'success',
                    'message': 'No vote action needed'
                }), 200
        
        # Update resource vote count
        if data['vote_type'] == 'upvote':
            db.resources.update_one(
                {'_id': ObjectId(resource_id)},
                {'$inc': {'upvotes': 1}}
            )
        elif data['vote_type'] == 'downvote':
            db.resources.update_one(
                {'_id': ObjectId(resource_id)},
                {'$inc': {'downvotes': 1}}
            )
        
        # Add notification for resource uploader if it's an upvote
        if data['vote_type'] == 'upvote' and resource['uploader_id'] != str(g.user['_id']):
            notification = {
                'user_id': resource['uploader_id'],
                'type': 'upvote',
                'content': f"Someone upvoted your resource: '{resource['title']}'",
                'reference_id': resource_id,
                'created_at': datetime.now(timezone.utc),
                'is_read': False
            }
            
            db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': f"Resource {data['vote_type']}d successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error in vote resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while voting resource'
        }), 500

@resources_bp.route('/<resource_id>', methods=['DELETE'])
@token_required
@verification_required
def delete_resource(resource_id):
    """Delete a resource"""
    try:
        db = get_db()
        
        # Find resource by ID
        resource = db.resources.find_one({'_id': ObjectId(resource_id)})
        
        if not resource:
            return jsonify({
                'status': 'error',
                'message': 'Resource not found'
            }), 404
        
        # Check if user is the uploader of the resource
        if resource['uploader_id'] != str(g.user['_id']) and g.user['role'] != 'admin':
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to delete this resource'
            }), 403
        
        # Delete file from GridFS if file_id exists
        if 'file_id' in resource and resource['file_id']:
            file_deleted = delete_file_from_gridfs(resource['file_id'])
            if not file_deleted:
                logger.warning(f"Could not delete file from GridFS for resource {resource_id}")
                # Continue with deletion of DB record even if file deletion fails
        else:
            # Check for legacy file in filesystem
            upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'resources')
            if 'filename' in resource and resource['filename']:
                file_path = os.path.join(upload_dir, resource['filename'])
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    logger.error(f"Error deleting file from filesystem: {str(e)}")
        
        # Delete resource from database
        db.resources.delete_one({'_id': ObjectId(resource_id)})
        
        # Delete associated votes
        db.resource_votes.delete_many({'resource_id': resource_id})
        
        return jsonify({
            'status': 'success',
            'message': 'Resource deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in delete resource: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while deleting resource'
        }), 500
