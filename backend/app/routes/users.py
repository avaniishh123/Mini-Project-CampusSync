# app/routes/users.py

from flask import Blueprint, request, jsonify, current_app, g, url_for
from app.db import get_db
from datetime import datetime, timedelta
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import re
import jwt
import os
import random
import string
import logging
import uuid
from functools import wraps
import time

logger = logging.getLogger(__name__)

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

# Helper function to validate college email domain
def is_valid_college_email(email, allowed_domains=None):
    """Validate if the email belongs to an allowed college domain"""
    if not allowed_domains:
        # Default allowed domains - can be moved to configuration
        allowed_domains = [
            'edu', 'ac.in', 'edu.in', 'university.edu', 'college.edu'
        ]
    
    domain = email.split('@')[-1]
    
    # Check if the domain ends with any of the allowed domains
    return any(domain.endswith(d) for d in allowed_domains)

# Generate verification code
def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({
                'status': 'error',
                'message': 'Authentication token is missing'
            }), 401
        
        try:
            # Decode token
            secret_key = current_app.config.get('SECRET_KEY')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Get user from database
            db = get_db()
            current_user = db.users.find_one({'_id': ObjectId(payload['user_id'])})
            
            if not current_user:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid authentication token'
                }), 401
            
            # Store user info in g object for use in route handlers
            g.user = current_user
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'status': 'error',
                'message': 'Authentication token has expired'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid authentication token'
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated

# Email verification required decorator
def verification_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        # Bypass verification check for development
        # Auto-verify user if not already verified
        if not g.user.get('is_verified', False):
            db = get_db()
            db.users.update_one(
                {'_id': g.user['_id']},
                {'$set': {'is_verified': True}}
            )
            logger.info(f"Auto-verified user in decorator: {g.user['email']}")
            
            # In production, you would want to uncomment the code below
            # return jsonify({
            #     'status': 'error',
            #     'message': 'Email verification required'
            # }), 403
        
        return f(*args, **kwargs)
    
    return decorated

@users_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with college email verification"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'name', 'year', 'department', 'college']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Validate email format
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, data['email']):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email format'
            }), 400
        
        # College email domain validation removed as per user request
        # if not is_valid_college_email(data['email']):
        #     return jsonify({
        #         'status': 'error',
        #         'message': 'Please use a valid college email address'
        #     }), 400
        
        # Validate password strength
        if len(data['password']) < 8:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 8 characters long'
            }, 400)
        
        db = get_db()
        
        # Check if username or email already exists
        existing_user = db.users.find_one({
            '$or': [
                {'username': data['username']},
                {'email': data['email']}
            ]
        })
        
        if existing_user:
            if existing_user['email'] == data['email']:
                return jsonify({
                    'status': 'error',
                    'message': 'Email already registered'
                }), 400
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Username already taken'
                }), 400
        
        # Generate verification code
        verification_code = generate_verification_code()
        verification_expires = datetime.utcnow() + timedelta(hours=24)
        
        # Create new user
        new_user = {
            'username': data['username'],
            'email': data['email'],
            'password_hash': generate_password_hash(data['password']),
            'name': data['name'],
            'year': data['year'],
            'department': data['department'],
            'college': data['college'],
            'created_at': datetime.utcnow(),
            'last_active': datetime.utcnow(),
            'role': 'student',  # Default role
            'profile_picture': None,
            'bio': data.get('bio'),
            'social_links': data.get('social_links', {}),
            'skills': data.get('skills', []),
            'notifications': [],
            'is_verified': False,  # Email verification status
            'security_question': data.get('security_question', ''),
            'security_answer': generate_password_hash(data.get('security_answer', '')) if data.get('security_answer') else '',
            'verification': {
                'code': verification_code,
                'expires_at': verification_expires
            },
            'preferences': {
                'email_notifications': True,
                'push_notifications': True
            }
        }
        
        result = db.users.insert_one(new_user)
        
        # In a real application, send verification email here
        # For now, just return the code in the response (for testing)
        
        # Generate JWT token for immediate login after registration
        try:
            # Create payload for JWT
            payload = {
                'user_id': str(result.inserted_id),
                'username': data['username'],
                'email': data['email'],
                'exp': datetime.utcnow() + timedelta(days=30)  # Token expires in 30 days
            }
            
            # Generate JWT token
            token = jwt.encode(
                payload,
                current_app.config.get('SECRET_KEY', 'dev-secret-key'),
                algorithm='HS256'
            )
            
            # Return success response with token
            return jsonify({
                'status': 'success',
                'message': 'Registration successful. Please verify your email.',
                'data': {
                    'user_id': str(result.inserted_id),
                    'verification_code': verification_code,  # Remove in production
                    'token': token  # Include token for frontend authentication
                }
            }), 201
        except Exception as e:
            logger.error(f"Error generating token: {str(e)}")
            # Still return success but without token
            return jsonify({
                'status': 'success',
                'message': 'Registration successful. Please verify your email.',
                'data': {
                    'user_id': str(result.inserted_id),
                    'verification_code': verification_code  # Remove in production
                }
            }), 201
        
    except Exception as e:
        logger.error(f"Error in user registration: {str(e)}")
        logger.error(f"Registration data: {data}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred during registration: {str(e)}'
        }), 500

@users_bp.route('/verify', methods=['POST'])
def verify_email():
    """Verify user's email with verification code"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'email' not in data or 'verification_code' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email and verification code are required'
            }), 400
        
        db = get_db()
        
        # Find user by email
        user = db.users.find_one({'email': data['email']})
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        # Check if user is already verified
        if user.get('is_verified', False):
            return jsonify({
                'status': 'success',
                'message': 'Email already verified'
            }), 200
        
        # Check if verification code is valid
        verification = user.get('verification', {})
        if not verification:
            return jsonify({
                'status': 'error',
                'message': 'Verification code not found'
            }), 400
        
        # Check if verification code has expired
        expires_at = verification.get('expires_at')
        if expires_at and expires_at < datetime.utcnow():
            return jsonify({
                'status': 'error',
                'message': 'Verification code has expired'
            }), 400
        
        # Check if verification code matches
        if verification.get('code') != data['verification_code']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid verification code'
            }), 400
        
        # Update user verification status
        db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'is_verified': True,
                    'verification': None
                }
            }
        )
        
        # Generate JWT token
        secret_key = current_app.config.get('SECRET_KEY')
        token = jwt.encode(
            {
                'user_id': str(user['_id']),
                'exp': datetime.utcnow() + timedelta(days=1)
            },
            secret_key,
            algorithm='HS256'
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Email verification successful',
            'data': {
                'token': token,
                'user_id': str(user['_id'])
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in email verification: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during verification'
        }), 500

@users_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    try:
        data = request.get_json()
        logger.info(f"Login attempt with data: {data}")
        
        # Validate required fields - accept either username/email and password
        if not data or (not data.get('username') and not data.get('email')) or not data.get('password'):
            return jsonify({
                'status': 'error',
                'message': 'Missing login credentials'
            }, 400)
            
        db = get_db()
        
        # Use username or email for login
        login_identifier = data.get('username') or data.get('email')
        
        # Find user by username or email
        user = db.users.find_one({
            '$or': [
                {'username': login_identifier},
                {'email': login_identifier}
            ]
        })
        
        if not user or not check_password_hash(user['password_hash'], data['password']):
            return jsonify({
                'status': 'error',
                'message': 'Invalid login credentials'
            }), 401
            
        # Generate JWT token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.utcnow() + timedelta(days=1)
        }, current_app.config['SECRET_KEY'])
        
        # Log successful login
        logger.info(f"Successful login for user: {user.get('username')}")
        
        # Get host URL for constructing full URLs
        host_url = request.host_url.rstrip('/')
        
        # Ensure profile_picture and background_image are full URLs if they're relative paths
        profile_picture = user.get('profile_picture')
        if profile_picture and not profile_picture.startswith(('http://', 'https://')):
            profile_picture = f"{host_url}{profile_picture}"
            
        background_image = user.get('background_image')
        if background_image and not background_image.startswith(('http://', 'https://')):
            background_image = f"{host_url}{background_image}"
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'token': token,
                'user': {
                    'id': str(user['_id']),
                    'username': user['username'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role'],
                    'profile_picture': profile_picture,
                    'background_image': background_image,
                    # Always use 'college' field for frontend compatibility
                    'college': user.get('college')
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in user login: {str(e)}")
        logger.error(f"Login data: {data}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred during login: {str(e)}'
        }), 500

@users_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user's profile"""
    try:
        user = g.user
        
        # Get host URL for constructing full URLs
        host_url = request.host_url.rstrip('/')
        
        # Ensure profile_picture and background_image are full URLs if they're relative paths
        profile_picture = user.get('profile_picture')
        if profile_picture and not profile_picture.startswith(('http://', 'https://')):
            profile_picture = f"{host_url}{profile_picture}"
            
        background_image = user.get('background_image')
        if background_image and not background_image.startswith(('http://', 'https://')):
            background_image = f"{host_url}{background_image}"
        
        return jsonify({
            'status': 'success',
            'data': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email'],
                'name': user['name'],
                'year': user['year'],
                'department': user['department'],
                'college': user['college'],
                'created_at': user['created_at'].isoformat(),
                'last_active': user['last_active'].isoformat(),
                'role': user['role'],
                'profile_picture': profile_picture,
                'background_image': background_image,
                'bio': user['bio'],
                'social_links': user['social_links'],
                'skills': user.get('skills', []),
                'is_verified': user.get('is_verified', False),
                'preferences': user['preferences']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get profile: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving profile'
        }), 500

# Helper function to save uploaded images
def save_uploaded_image(file, folder='profile_images'):
    """Save an uploaded image to MongoDB and return the file ID and URL"""
    try:
        logger.info(f"Attempting to save uploaded image: {file.filename}")
        
        # Generate a unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # Get file content
        file_content = file.read()
        file_size = len(file_content)
        
        # Check content type
        content_type = file.content_type if hasattr(file, 'content_type') else 'application/octet-stream'
        
        # Get file extension
        file_ext = os.path.splitext(filename)[1].lower().replace('.', '')
        
        # Determine if it's an image or document based on extension and content type
        is_image = file_ext in ['jpg', 'jpeg', 'png', 'gif'] or content_type.startswith('image/')
        
        # Get host URL for constructing full URLs
        host_url = request.host_url.rstrip('/')
        
        # Determine the storage method based on file type and folder
        if folder == 'post_attachments' or folder == 'resources' or not is_image:
            # Use GridFS for documents (large files)
            from app.db import save_file_to_gridfs
            file_id = save_file_to_gridfs(file_content, unique_filename, content_type)
            
            # Generate URL with full host
            relative_url = f"/api/files/gridfs/{file_id}"
            file_url = f"{host_url}{relative_url}"
            logger.info(f"Saved document to GridFS with ID: {file_id}, URL: {file_url}")
            
            return {
                'file_id': str(file_id),
                'file_url': file_url,
                'filename': unique_filename,
                'original_filename': filename,
                'content_type': content_type,
                'file_size': file_size,
                'file_ext': file_ext,
                'is_image': is_image,
                'storage_type': 'gridfs'
            }
        else:
            # Use binary storage for images
            from app.db import save_binary_image
            file_id = save_binary_image(file_content, unique_filename, content_type)
            
            # Generate URL with full host
            relative_url = f"/api/files/image/{file_id}"
            file_url = f"{host_url}{relative_url}"
            logger.info(f"Saved image to binary storage with ID: {file_id}, URL: {file_url}")
            
            return {
                'file_id': str(file_id),
                'file_url': file_url,
                'filename': unique_filename,
                'original_filename': filename,
                'content_type': content_type,
                'file_size': file_size,
                'file_ext': file_ext,
                'is_image': True,
                'storage_type': 'binary'
            }
    except Exception as e:
        logger.error(f"Error saving uploaded file: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

@users_bp.route('/profile', methods=['PUT'])
@token_required
@verification_required
def update_profile():
    """Update current user's profile"""
    try:
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = [
            'name', 'email', 'bio', 'social_links', 'profile_picture', 
            'skills', 'preferences', 'year', 'department', 'college'
        ]
        
        # Filter out fields that are not allowed to be updated
        update_fields = {k: v for k, v in data.items() if k in allowed_fields}
        
        # Add last active timestamp
        update_fields['last_active'] = datetime.utcnow()
        
        db = get_db()
        
        # Update user profile
        result = db.users.update_one(
            {'_id': g.user['_id']},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the profile'
            }), 400
        
        # Get updated user data
        updated_user = db.users.find_one({'_id': g.user['_id']})
        
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully',
            'data': {
                'id': str(updated_user['_id']),
                'name': updated_user['name'],
                'username': updated_user['username'],
                'email': updated_user['email'],
                'college': updated_user.get('college'),
                'profile_picture': updated_user.get('profile_picture'),
                'bio': updated_user.get('bio', ''),
                'social_links': updated_user.get('social_links', {}),
                'skills': updated_user.get('skills', []),
                'preferences': updated_user.get('preferences', {})
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update profile: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating profile'
        }), 500

@users_bp.route('/<user_id>/profile-image', methods=['POST'])
@token_required
@verification_required
def upload_profile_image(user_id):
    """Upload a profile image for a user"""
    try:
        logger.info(f"Profile image upload request received for user_id: {user_id}")
        logger.info(f"Current user ID: {str(g.user['_id'])}")
        logger.info(f"Request files: {request.files}")
        logger.info(f"Request form: {request.form}")
        
        # Check if the user is authorized to update this profile
        if str(g.user['_id']) != user_id and g.user.get('role') != 'admin':
            logger.error(f"Authorization failed: {str(g.user['_id'])} != {user_id}")
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this profile'
            }), 403
            
        # Check if file is in the request
        if 'profile_image' not in request.files:
            logger.error("No profile_image in request.files")
            return jsonify({
                'status': 'error',
                'message': 'No file part in the request'
            }), 400
            
        file = request.files['profile_image']
        logger.info(f"Received file: {file.filename}, {file.content_type}")
        
        # Check if file is selected
        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
            
        # Check if file is an image
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_ext = os.path.splitext(file.filename)[1].lower().replace('.', '')
        if file_ext not in allowed_extensions:
            logger.error(f"Invalid file extension: {file_ext}")
            return jsonify({
                'status': 'error',
                'message': f'File type not allowed. Please upload an image file (png, jpg, jpeg, gif). Got: {file_ext}'
            }), 400
            
        # Save the image
        logger.info("Saving uploaded image...")
        image_data = save_uploaded_image(file)
        if not image_data:
            logger.error("Failed to save image")
            return jsonify({
                'status': 'error',
                'message': 'Failed to save the image'
            }), 500
            
        logger.info(f"Image saved successfully: {image_data}")
        db = get_db()
        
        # Update user profile with new image URL
        logger.info(f"Updating user profile with new image URL: {image_data['file_url']}")
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'profile_picture': image_data['file_url'],
                'last_active': datetime.utcnow()
            }}
        )
        
        logger.info(f"Database update result: {result.modified_count} documents modified")
        if result.modified_count == 0:
            logger.error("No documents were modified in the database")
            return jsonify({
                'status': 'error',
                'message': 'Failed to update profile image'
            }), 500
            
        # Get the updated user to verify the change
        updated_user = db.users.find_one({'_id': ObjectId(user_id)})
        logger.info(f"Updated user profile_picture: {updated_user.get('profile_picture')}")
        
        response_data = {
            'status': 'success',
            'message': 'Profile image updated successfully',
            'data': {
                'profile_picture': image_data['file_url']
            }
        }
        logger.info(f"Sending response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error in upload profile image: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while uploading profile image: {str(e)}'
        }), 500

@users_bp.route('/<user_id>/background-image', methods=['POST'])
@token_required
@verification_required
def upload_background_image(user_id):
    """Upload a background image for a user"""
    try:
        logger.info(f"Background image upload request received for user_id: {user_id}")
        logger.info(f"Current user ID: {str(g.user['_id'])}")
        logger.info(f"Request files: {request.files}")
        logger.info(f"Request form: {request.form}")
        
        # Check if the user is authorized to update this profile
        if str(g.user['_id']) != user_id and g.user.get('role') != 'admin':
            logger.error(f"Authorization failed: {str(g.user['_id'])} != {user_id}")
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this profile'
            }), 403
            
        # Check if file is in the request
        if 'background_image' not in request.files:
            logger.error("No background_image in request.files")
            return jsonify({
                'status': 'error',
                'message': 'No file part in the request'
            }), 400
            
        file = request.files['background_image']
        logger.info(f"Received file: {file.filename}, {file.content_type}")
        
        # Check if file is selected
        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
            
        # Check if file is an image
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_ext = os.path.splitext(file.filename)[1].lower().replace('.', '')
        if file_ext not in allowed_extensions:
            logger.error(f"Invalid file extension: {file_ext}")
            return jsonify({
                'status': 'error',
                'message': f'File type not allowed. Please upload an image file (png, jpg, jpeg, gif). Got: {file_ext}'
            }), 400
            
        # Save the image
        logger.info("Saving uploaded background image...")
        image_data = save_uploaded_image(file, folder='background_images')
        if not image_data:
            logger.error("Failed to save background image")
            return jsonify({
                'status': 'error',
                'message': 'Failed to save the background image'
            }), 500
            
        logger.info(f"Background image saved successfully: {image_data}")
        db = get_db()
        
        # Update user profile with new background image URL
        logger.info(f"Updating user profile with new background image URL: {image_data['file_url']}")
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'background_image': image_data['file_url'],
                'last_active': datetime.utcnow()
            }}
        )
        
        logger.info(f"Database update result: {result.modified_count} documents modified")
        if result.modified_count == 0:
            logger.error("No documents were modified in the database")
            return jsonify({
                'status': 'error',
                'message': 'Failed to update background image'
            }), 500
            
        # Get the updated user to verify the change
        updated_user = db.users.find_one({'_id': ObjectId(user_id)})
        logger.info(f"Updated user background_image: {updated_user.get('background_image')}")
        
        response_data = {
            'status': 'success',
            'message': 'Background image updated successfully',
            'data': {
                'background_image': image_data['file_url']
            }
        }
        logger.info(f"Sending response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error in upload background image: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while uploading background image: {str(e)}'
        }), 500

@users_bp.route('/change-password', methods=['POST'])
@token_required
@verification_required
def change_password():
    """Change user's password"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'current_password' not in data or 'new_password' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Current password and new password are required'
            }), 400
            
        # Validate new password strength
        if len(data['new_password']) < 8:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 8 characters long'
            }), 400
        
        # Check if current password is correct
        if not check_password_hash(g.user['password_hash'], data['current_password']):
            return jsonify({
                'status': 'error',
                'message': 'Current password is incorrect'
            }), 401
        
        # Update password
        db = get_db()
        db.users.update_one(
            {'_id': g.user['_id']},
            {
                '$set': {
                    'password_hash': generate_password_hash(data['new_password']),
                    'last_active': datetime.utcnow()
                }
            }
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in change password: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while changing password'
        }), 500

@users_bp.route('/users', methods=['GET'])
@token_required
@verification_required
def get_users():
    """Get list of users (with optional filtering)"""
    try:
        # Get query parameters
        name = request.args.get('name')
        department = request.args.get('department')
        year = request.args.get('year')
        college = request.args.get('college')
        skills = request.args.get('skills')
        
        # Build query
        query = {}
        
        if name:
            query['name'] = {'$regex': name, '$options': 'i'}
        
        if department:
            query['department'] = {'$regex': department, '$options': 'i'}
        
        if year:
            query['year'] = year
        
        if college:
            query['college'] = {'$regex': college, '$options': 'i'}
        
        if skills:
            skills_list = [s.strip() for s in skills.split(',')]
            query['skills'] = {'$in': skills_list}
        
        # Only get verified users
        query['is_verified'] = True
        
        db = get_db()
        
        # Get users from database
        users = list(db.users.find(
            query,
            {
                'password_hash': 0,
                'verification': 0,
                'notifications': 0
            }
        ).limit(50))
        
        # Convert ObjectId to string
        for user in users:
            user['_id'] = str(user['_id'])
            user['created_at'] = user['created_at'].isoformat()
            user['last_active'] = user['last_active'].isoformat()
        
        return jsonify({
            'status': 'success',
            'data': users
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get users: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving users'
        }), 500

@users_bp.route('/users/<user_id>', methods=['GET'])
@token_required
@verification_required
def get_user(user_id):
    """Get a specific user's profile"""
    try:
        db = get_db()
        
        # Find user by ID
        user = db.users.find_one(
            {'_id': ObjectId(user_id)},
            {
                'password_hash': 0,
                'verification': 0,
                'notifications': 0
            }
        )
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        # Convert ObjectId to string
        user['_id'] = str(user['_id'])
        user['created_at'] = user['created_at'].isoformat()
        user['last_active'] = user['last_active'].isoformat()
        
        return jsonify({
            'status': 'success',
            'data': user
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get user: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving user'
        }), 500

@users_bp.route('/account', methods=['DELETE'])
@token_required
@verification_required
def delete_account():
    """Delete the current user's account"""
    try:
        db = get_db()
        user_id = g.user['_id']
        
        # Start a session for transaction
        with db.client.start_session() as session:
            with session.start_transaction():
                # Delete user's posts
                db.posts.delete_many({'author_id': str(user_id)}, session=session)
                
                # Delete user's comments
                db.comments.delete_many({'author_id': str(user_id)}, session=session)
                
                # Delete user's likes
                db.post_likes.delete_many({'user_id': str(user_id)}, session=session)
                
                # Delete user's resources
                # Delete all resources uploaded by the user (string or ObjectId match)
                from bson import ObjectId
                resources = list(db.resources.find({
                    '$or': [
                        {'uploader_id': str(user_id)},
                        {'uploader_id': ObjectId(user_id)}
                    ]
                }, session=session))
                resource_ids = [str(r['_id']) for r in resources]
                db.resources.delete_many({
                    '$or': [
                        {'uploader_id': str(user_id)},
                        {'uploader_id': ObjectId(user_id)}
                    ]
                }, session=session)
                # Delete associated resource votes
                if resource_ids:
                    db.resource_votes.delete_many({'resource_id': {'$in': resource_ids}}, session=session)

                # Clean up orphaned resources (missing/null/empty uploader_id)
                db.resources.delete_many({'uploader_id': {'$exists': False}}, session=session)
                db.resources.delete_many({'uploader_id': None}, session=session)
                db.resources.delete_many({'uploader_id': ''}, session=session)
                
                # Delete user's notifications
                db.notifications.delete_many({'user_id': str(user_id)}, session=session)

                # Delete user's opportunities
                opportunities = list(db.opportunities.find({'poster_id': str(user_id)}, session=session))
                opportunity_ids = [str(o['_id']) for o in opportunities]
                db.opportunities.delete_many({'poster_id': str(user_id)}, session=session)
                # Delete associated applications and verification requests
                if opportunity_ids:
                    db.applications.delete_many({'opportunity_id': {'$in': opportunity_ids}}, session=session)
                    db.verification_requests.delete_many({'opportunity_id': {'$in': opportunity_ids}}, session=session)

                # Delete user's profile
                result = db.users.delete_one({'_id': user_id}, session=session)
                
                if result.deleted_count == 0:
                    return jsonify({
                        'status': 'error',
                        'message': 'Failed to delete account'
                    }), 500
        
        logger.info(f"User account deleted: {g.user['email']}")
        
        return jsonify({
            'status': 'success',
            'message': 'Account deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in delete account: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while deleting account'
        }), 500

@users_bp.route('/forgot-password/initiate', methods=['POST'])
def initiate_forgot_password():
    """Initiate forgot password process by email"""
    try:
        data = request.get_json()
        
        if 'email' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email is required'
            }), 400
        
        email = data['email'].lower().strip()
        
        # Rate limiting check
        if not check_rate_limit(f"forgot_init_{email}", max_attempts=3, window_minutes=15):
            return jsonify({
                'status': 'error',
                'message': 'Too many attempts. Please try again later.'
            }), 429
        
        db = get_db()
        user = db.users.find_one({'email': email})
        
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({
                'status': 'success',
                'message': 'If the email exists, you will receive security question'
            }), 200
        
        # Check if user has security question set up
        if not user.get('security_question') or not user.get('security_answer'):
            return jsonify({
                'status': 'error',
                'message': 'Security question not set up for this account. Please contact support.'
            }), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Security question found',
            'data': {
                'security_question': user['security_question']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in initiate forgot password: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while processing request'
        }), 500

@users_bp.route('/forgot-password/verify', methods=['POST'])
def verify_security_answer():
    """Verify security answer and generate reset token"""
    try:
        data = request.get_json()
        
        if 'email' not in data or 'security_answer' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email and security answer are required'
            }), 400
        
        email = data['email'].lower().strip()
        security_answer = data['security_answer'].strip()
        
        # Rate limiting check for security answer attempts
        if not check_rate_limit(f"security_answer_{email}", max_attempts=5, window_minutes=30):
            return jsonify({
                'status': 'error',
                'message': 'Too many failed attempts. Please try again later.'
            }), 429
        
        db = get_db()
        user = db.users.find_one({'email': email})
        
        if not user:
            record_failed_attempt(f"security_answer_{email}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or security answer'
            }), 400
        
        # Verify security answer
        if not check_password_hash(user['security_answer'], security_answer):
            # Log failed attempt for security monitoring
            logger.warning(f"Failed security answer attempt for email: {email}")
            record_failed_attempt(f"security_answer_{email}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or security answer'
            }), 400
        
        # Generate reset token (valid for 15 minutes)
        reset_token = jwt.encode(
            {
                'user_id': str(user['_id']),
                'email': user['email'],
                'type': 'password_reset',
                'exp': datetime.utcnow() + timedelta(minutes=15)
            },
            current_app.config.get('SECRET_KEY'),
            algorithm='HS256'
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Security answer verified',
            'data': {
                'reset_token': reset_token
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in verify security answer: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while verifying security answer'
        }), 500

@users_bp.route('/forgot-password/reset', methods=['POST'])
def reset_password():
    """Reset password using reset token"""
    try:
        data = request.get_json()
        
        if 'reset_token' not in data or 'new_password' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Reset token and new password are required'
            }), 400
        
        reset_token = data['reset_token']
        new_password = data['new_password']
        
        # Validate new password strength
        if len(new_password) < 8:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 8 characters long'
            }), 400
        
        try:
            # Decode reset token
            secret_key = current_app.config.get('SECRET_KEY')
            payload = jwt.decode(reset_token, secret_key, algorithms=['HS256'])
            
            # Verify token type
            if payload.get('type') != 'password_reset':
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid reset token'
                }), 400
            
            user_id = payload['user_id']
            email = payload['email']
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'status': 'error',
                'message': 'Reset token has expired. Please try again.'
            }), 400
        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid reset token'
            }), 400
        
        db = get_db()
        user = db.users.find_one({'_id': ObjectId(user_id), 'email': email})
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 400
        
        # Update password
        db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'password_hash': generate_password_hash(new_password),
                    'last_active': datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Password reset successful for user: {email}")
        
        return jsonify({
            'status': 'success',
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in reset password: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while resetting password'
        }), 500

# Rate limiting for security
failed_attempts = {}

def check_rate_limit(identifier, max_attempts=5, window_minutes=15):
    """Check if too many failed attempts have been made"""
    current_time = time.time()
    window_seconds = window_minutes * 60
    
    # Clean old entries
    failed_attempts[identifier] = [
        attempt_time for attempt_time in failed_attempts.get(identifier, [])
        if current_time - attempt_time < window_seconds
    ]
    
    # Check if too many attempts
    if len(failed_attempts[identifier]) >= max_attempts:
        return False
    
    return True

def record_failed_attempt(identifier):
    """Record a failed attempt"""
    if identifier not in failed_attempts:
        failed_attempts[identifier] = []
    failed_attempts[identifier].append(time.time())
