"""
Simple Flask Server for Testing
This will help diagnose issues with the CampusConnect API
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Simple Flask Server for Testing',
        'status': 'online'
    })

@app.route('/api/users/register', methods=['POST'])
def register():
    """Test register endpoint"""
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'message': 'User registered successfully',
        'data': {
            'user_id': '12345',
            'verification_code': '123456',
            'username': data.get('username')
        }
    }), 201

@app.route('/api/users/verify', methods=['POST'])
def verify_email():
    """Test email verification endpoint"""
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'message': 'Email verified successfully',
        'data': {
            'token': 'test_token_12345',
            'user_id': '12345'
        }
    })

@app.route('/api/users/login', methods=['POST'])
def login():
    """Test login endpoint"""
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'message': 'Login successful',
        'data': {
            'token': 'test_token_12345',
            'user_id': '12345',
            'email': data.get('email')
        }
    })

@app.route('/api/users/profile', methods=['GET'])
def get_profile():
    """Test get profile endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Profile retrieved successfully',
        'data': {
            'user_id': '12345',
            'username': 'testuser',
            'email': 'testuser@college.edu',
            'name': 'Test User',
            'year': '3rd Year',
            'department': 'Computer Science',
            'college': 'Test College',
            'profile_picture': None,
            'bio': 'This is a test bio',
            'created_at': '2025-05-26T11:28:00Z'
        }
    })

@app.route('/api/social-feed/posts', methods=['GET'])
def get_posts():
    """Test get posts endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Posts retrieved successfully',
        'data': {
            'posts': [
                {
                    'post_id': '1',
                    'title': 'Test Post 1',
                    'content': 'This is test post 1',
                    'author': 'testuser',
                    'created_at': '2025-05-26T11:00:00Z',
                    'likes': 5,
                    'comments': 2
                },
                {
                    'post_id': '2',
                    'title': 'Test Post 2',
                    'content': 'This is test post 2',
                    'author': 'testuser',
                    'created_at': '2025-05-26T10:30:00Z',
                    'likes': 3,
                    'comments': 1
                }
            ],
            'total': 2,
            'page': 1,
            'per_page': 10
        }
    })

@app.route('/api/social-feed/posts', methods=['POST'])
def create_post():
    """Test create post endpoint"""
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'message': 'Post created successfully',
        'data': {
            'post_id': '3',
            'title': data.get('title'),
            'content': data.get('content'),
            'author': 'testuser',
            'created_at': '2025-05-26T11:30:00Z',
            'likes': 0,
            'comments': 0
        }
    }), 201

@app.route('/api/study-groups', methods=['GET'])
def get_study_groups():
    """Test get study groups endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Study groups retrieved successfully',
        'data': {
            'study_groups': [
                {
                    'group_id': '1',
                    'name': 'Test Study Group 1',
                    'description': 'This is test study group 1',
                    'subject': 'Computer Science',
                    'created_at': '2025-05-26T11:00:00Z',
                    'members': 5,
                    'is_virtual': True
                },
                {
                    'group_id': '2',
                    'name': 'Test Study Group 2',
                    'description': 'This is test study group 2',
                    'subject': 'Mathematics',
                    'created_at': '2025-05-26T10:30:00Z',
                    'members': 3,
                    'is_virtual': False
                }
            ],
            'total': 2,
            'page': 1,
            'per_page': 10
        }
    })

@app.route('/api/study-groups', methods=['POST'])
def create_study_group():
    """Test create study group endpoint"""
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'message': 'Study group created successfully',
        'data': {
            'group_id': '3',
            'name': data.get('name'),
            'description': data.get('description'),
            'subject': data.get('subject'),
            'created_at': '2025-05-26T11:30:00Z',
            'members': 1,
            'is_virtual': data.get('is_virtual', False)
        }
    }), 201

@app.route('/api/opportunities', methods=['GET'])
def get_opportunities():
    """Test get opportunities endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Opportunities retrieved successfully',
        'data': {
            'opportunities': [
                {
                    'opportunity_id': '1',
                    'title': 'Test Opportunity 1',
                    'description': 'This is test opportunity 1',
                    'company': 'Test Company 1',
                    'type': 'internship',
                    'created_at': '2025-05-26T11:00:00Z',
                    'deadline': '2025-06-30T23:59:59Z',
                    'is_paid': True
                },
                {
                    'opportunity_id': '2',
                    'title': 'Test Opportunity 2',
                    'description': 'This is test opportunity 2',
                    'company': 'Test Company 2',
                    'type': 'job',
                    'created_at': '2025-05-26T10:30:00Z',
                    'deadline': '2025-07-15T23:59:59Z',
                    'is_paid': True
                }
            ],
            'total': 2,
            'page': 1,
            'per_page': 10
        }
    })

@app.route('/api/opportunities', methods=['POST'])
def create_opportunity():
    """Test create opportunity endpoint"""
    data = request.get_json()
    return jsonify({
        'status': 'success',
        'message': 'Opportunity created successfully',
        'data': {
            'opportunity_id': '3',
            'title': data.get('title'),
            'description': data.get('description'),
            'company': data.get('company'),
            'type': data.get('type'),
            'created_at': '2025-05-26T11:30:00Z',
            'deadline': data.get('deadline'),
            'is_paid': data.get('is_paid', False)
        }
    }), 201

if __name__ == '__main__':
    print("Starting simple Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
