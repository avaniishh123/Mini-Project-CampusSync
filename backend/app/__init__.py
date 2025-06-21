# app/__init__.py

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
import time
from werkzeug.exceptions import HTTPException

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    # Create static folder path for uploads if it doesn't exist
    static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    uploads_folder = os.path.join(static_folder, 'uploads')
    
    # Create directories if they don't exist
    os.makedirs(static_folder, exist_ok=True)
    os.makedirs(uploads_folder, exist_ok=True)
    
    # Create subdirectories for different types of uploads
    subdirs = ['profile_images', 'post_images', 'comment_images', 'post_attachments', 'background_images']
    for subdir in subdirs:
        os.makedirs(os.path.join(uploads_folder, subdir), exist_ok=True)
    
    # Initialize Flask with static folder
    app = Flask(__name__, static_folder=static_folder, static_url_path='/static')
    
    # Load configuration from config.py
    from .config import get_config
    app.config.from_object(get_config())
    
    # Set upload folder in config
    app.config['UPLOAD_FOLDER'] = uploads_folder
    
    # Initialize MongoDB
    from .db import mongo, init_db
    mongo.init_app(app)
    init_db(app)
    
    # Configure CORS to allow specific origins
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*').split(',')
    CORS(app, resources={
        r"/*": {
            "origins": allowed_origins,  # Use environment variable or default to all
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "supports_credentials": True
        }
    })
    
    # Request logging middleware
    @app.before_request
    def log_request_info():
        app.logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")
        request.start_time = time.time()
    
    @app.after_request
    def log_response_info(response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            app.logger.info(f"Response: {response.status_code} in {duration:.4f}s")
        return response
    
    # Register blueprints
    from .routes.users import users_bp
    from .routes.doubts import doubts_bp
    from .routes.notes import notes_bp
    from .routes.calendar import calendar_bp
    from .routes.feedback import feedback_bp
    from .routes.marketplace import marketplace_bp
    from .routes.internships import internships_bp
    from .routes.study_groups import study_groups_bp
    
    # Register new blueprints
    from .routes.social_feed import social_feed_bp
    from .routes.resources import resources_bp
    from .routes.opportunities import opportunities_bp
    from .routes.campus_news import campus_news_bp
    from .routes.campus_events import campus_events_bp
    from .routes.summarize import summarize_bp
    from .routes.files import files_bp  # New files blueprint for serving media from DB
    
    app.register_blueprint(users_bp)
    app.register_blueprint(doubts_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(marketplace_bp)
    app.register_blueprint(internships_bp)
    app.register_blueprint(study_groups_bp)
    
    # Register new blueprints
    app.register_blueprint(social_feed_bp)
    app.register_blueprint(resources_bp)
    app.register_blueprint(opportunities_bp)
    app.register_blueprint(campus_news_bp)
    app.register_blueprint(campus_events_bp)
    app.register_blueprint(summarize_bp)
    app.register_blueprint(files_bp)  # Register the files blueprint
    
    # Root endpoint
    @app.route('/')
    def index():
        api_version = app.config.get('API_VERSION', 'v1')
        return jsonify({
            'message': 'Welcome to CampusConnect API',
            'version': api_version,
            'status': 'online',
            'environment': app.config.get('FLASK_ENV', 'development'),
            'endpoints': {
                'users': '/users/register',
                'doubts': '/doubts/questions',
                'notes': '/notes',
                'calendar': '/calendar',
                'feedback': '/feedback',
                'marketplace': '/marketplace/items',
                'internships': '/internships/list',
                'study_groups': '/study_groups/list'
            }
        })
    
    # Enhanced error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request parameters',
            'status_code': 400
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication is required to access this resource',
            'status_code': 401
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource',
            'status_code': 403
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested URL was not found on the server',
            'status_code': 404
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'error': 'Method Not Allowed',
            'message': f'The method {request.method} is not allowed for the requested URL',
            'status_code': 405
        }), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal Server Error: {str(error)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred on the server',
            'status_code': 500
        }), 500
    
    # Generic error handler for all HTTP exceptions
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        response = jsonify({
            'error': error.name,
            'message': error.description,
            'status_code': error.code
        })
        response.status_code = error.code
        return response
    
    # Generic error handler for all other exceptions
    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        app.logger.exception("Unhandled exception occurred")
        response = jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred on the server',
            'status_code': 500
        })
        response.status_code = 500
        return response
    
    # Add a health check endpoint
    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'CampusSync API is running',
            'version': '1.0.0',
            'timestamp': time.time()
        })
    
    # Add a route to serve the test page
    @app.route('/', methods=['GET'])
    def index():
        return send_from_directory(static_folder, 'test.html')
    
    return app