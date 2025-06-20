"""
Middleware for the CampusConnect API
Provides error handling, request validation, and other middleware functionality
"""

import time
import logging
from functools import wraps
from flask import request, jsonify, g, current_app
import jwt
from werkzeug.exceptions import BadRequest, Unauthorized, Forbidden

logger = logging.getLogger(__name__)

def request_logger(f):
    """Middleware to log request details"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Log request details
        request_id = request.headers.get('X-Request-ID', 'N/A')
        logger.info(f"Request {request_id}: {request.method} {request.path} from {request.remote_addr}")
        
        # Set start time
        start_time = time.time()
        
        # Process request
        response = f(*args, **kwargs)
        
        # Log response time
        duration = time.time() - start_time
        logger.info(f"Response {request_id}: {response.status_code} in {duration:.4f}s")
        
        return response
    return decorated_function

def validate_json(required_fields=None):
    """Middleware to validate JSON request data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if content type is application/json
            if request.method in ['POST', 'PUT'] and not request.is_json:
                raise BadRequest("Content-Type must be application/json")
            
            # Check if required fields are present
            if required_fields and request.is_json:
                data = request.get_json()
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    raise BadRequest(f"Missing required fields: {', '.join(missing_fields)}")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def token_required(f):
    """Middleware to validate JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        # Check if token exists
        if not token:
            raise Unauthorized("Authentication token is missing")
        
        try:
            # Decode token
            secret_key = current_app.config.get('SECRET_KEY')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Store user info in g object for use in route handlers
            g.user = payload
            
        except jwt.ExpiredSignatureError:
            raise Unauthorized("Authentication token has expired")
        except jwt.InvalidTokenError:
            raise Unauthorized("Invalid authentication token")
        
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    """Middleware to check if user has required role"""
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            # Check if user has required role
            if g.user.get('role') not in roles:
                raise Forbidden("You do not have permission to access this resource")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def error_handler(app):
    """Register error handlers for the application"""
    
    @app.errorhandler(BadRequest)
    def handle_bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description),
            'status_code': 400
        }), 400
    
    @app.errorhandler(Unauthorized)
    def handle_unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': str(error.description),
            'status_code': 401
        }), 401
    
    @app.errorhandler(Forbidden)
    def handle_forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': str(error.description),
            'status_code': 403
        }), 403
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        logger.exception("Unhandled exception")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500
