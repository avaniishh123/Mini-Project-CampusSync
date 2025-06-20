"""
Utility functions for the CampusConnect API
"""

import re
import json
import uuid
import datetime
from bson import ObjectId, json_util
from flask import jsonify

class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle MongoDB ObjectId and datetime objects"""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)

def parse_json(data):
    """Parse JSON data using custom encoder"""
    return json.loads(json_util.dumps(data))

def generate_response(data=None, message=None, status=200):
    """Generate a standardized API response"""
    response = {
        'status': 'success' if status < 400 else 'error',
        'timestamp': datetime.datetime.utcnow().isoformat()
    }
    
    if message:
        response['message'] = message
    
    if data is not None:
        response['data'] = data
    
    return jsonify(response), status

def validate_email(email):
    """Validate email format"""
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email) is not None

def validate_password(password):
    """
    Validate password strength
    Requirements:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

def generate_id():
    """Generate a unique ID"""
    return str(uuid.uuid4())

def format_date(date_string, input_format='%Y-%m-%d', output_format='%Y-%m-%d'):
    """Format date string"""
    try:
        date_obj = datetime.datetime.strptime(date_string, input_format)
        return date_obj.strftime(output_format)
    except ValueError:
        return None

def paginate(items, page=1, per_page=10):
    """Paginate items"""
    page = int(page)
    per_page = int(per_page)
    
    # Ensure page is at least 1
    page = max(1, page)
    
    # Calculate start and end indices
    start = (page - 1) * per_page
    end = start + per_page
    
    # Get items for current page
    paginated_items = items[start:end]
    
    # Calculate total pages
    total_items = len(items)
    total_pages = (total_items + per_page - 1) // per_page
    
    return {
        'items': paginated_items,
        'page': page,
        'per_page': per_page,
        'total_items': total_items,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1
    }

def sanitize_input(text):
    """Sanitize user input to prevent injection attacks"""
    if text is None:
        return None
    
    # Remove HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    
    # Escape special characters
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#x27;')
    
    return text
