from flask import Blueprint, request, jsonify, g, current_app
from app.db import get_db
from datetime import datetime
from bson import ObjectId
import logging
from app.routes.users import token_required, verification_required

logger = logging.getLogger(__name__)

study_groups_bp = Blueprint('study_groups', __name__, url_prefix='/api/study-groups')

@study_groups_bp.route('', methods=['POST'])
@token_required
@verification_required
def create_study_group():
    """Create a new study group"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'description', 'subject']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Create new study group
        new_group = {
            'name': data['name'],
            'description': data['description'],
            'subject': data['subject'],
            'creator_id': str(g.user['_id']),
            'created_at': datetime.utcnow(),
            'meeting_schedule': data.get('meeting_schedule'),
            'meeting_location': data.get('meeting_location'),
            'is_virtual': data.get('is_virtual', False),
            'virtual_meeting_link': data.get('virtual_meeting_link'),
            'max_members': data.get('max_members'),
            'is_private': data.get('is_private', False),
            'tags': data.get('tags', [])
        }
        
        db = get_db()
        result = db.study_groups.insert_one(new_group)
        
        # Add creator as a member
        member = {
            'group_id': str(result.inserted_id),
            'user_id': str(g.user['_id']),
            'role': 'admin',  # Creator is admin by default
            'joined_at': datetime.utcnow()
        }
        
        db.group_members.insert_one(member)
        
        return jsonify({
            'status': 'success',
            'message': 'Study group created successfully',
            'data': {
                'group_id': str(result.inserted_id)
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in create study group: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while creating study group'
        }), 500

@study_groups_bp.route('', methods=['GET'])
@token_required
@verification_required
def get_study_groups():
    """Get all study groups with optional filtering"""
    try:
        # Get query parameters
        subject = request.args.get('subject')
        search = request.args.get('search')
        limit = int(request.args.get('limit', 20))
        skip = int(request.args.get('skip', 0))
        
        # Build query
        query = {}
        
        if subject:
            query['subject'] = subject
        
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'subject': {'$regex': search, '$options': 'i'}}
            ]
        
        db = get_db()
        
        # Get study groups from database
        study_groups = list(db.study_groups.find(query).sort('created_at', -1).skip(skip).limit(limit))
        
        # Process study groups
        for group in study_groups:
            group['_id'] = str(group['_id'])
            group['created_at'] = group['created_at'].isoformat()
            
            # Get creator details
            creator = db.users.find_one(
                {'_id': ObjectId(group['creator_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            
            if creator:
                group['creator'] = {
                    'id': str(creator['_id']),
                    'username': creator['username'],
                    'name': creator['name'],
                    'profile_picture': creator['profile_picture']
                }
            
            # Get member count
            group['member_count'] = db.group_members.count_documents({'group_id': group['_id']})
            
            # Check if current user is a member
            group['is_member'] = db.group_members.count_documents({
                'group_id': group['_id'],
                'user_id': str(g.user['_id'])
            }) > 0
        
        # Get total count
        total_count = db.study_groups.count_documents(query)
        
        return jsonify({
            'status': 'success',
            'data': {
                'study_groups': study_groups,
                'total_count': total_count,
                'has_more': total_count > skip + limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get study groups: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving study groups'
        }), 500

@study_groups_bp.route('/<group_id>', methods=['GET'])
@token_required
@verification_required
def get_study_group(group_id):
    """Get a specific study group"""
    try:
        db = get_db()
        
        # Find study group by ID
        group = db.study_groups.find_one({'_id': ObjectId(group_id)})
        
        if not group:
            return jsonify({
                'status': 'error',
                'message': 'Study group not found'
            }), 404
        
        # Convert ObjectId to string
        group['_id'] = str(group['_id'])
        group['created_at'] = group['created_at'].isoformat()
        
        # Get creator details
        creator = db.users.find_one(
            {'_id': ObjectId(group['creator_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if creator:
            group['creator'] = {
                'id': str(creator['_id']),
                'username': creator['username'],
                'name': creator['name'],
                'profile_picture': creator['profile_picture']
            }
        
        # Get members
        members = list(db.group_members.find({'group_id': group_id}))
        
        # Process members
        processed_members = []
        for member in members:
            member['_id'] = str(member['_id'])
            member['joined_at'] = member['joined_at'].isoformat()
            
            # Get member details
            user = db.users.find_one(
                {'_id': ObjectId(member['user_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            
            if user:
                processed_members.append({
                    'id': str(user['_id']),
                    'username': user['username'],
                    'name': user['name'],
                    'profile_picture': user['profile_picture'],
                    'role': member['role'],
                    'joined_at': member['joined_at']
                })
        
        group['members'] = processed_members
        group['member_count'] = len(processed_members)
        
        # Check if current user is a member
        group['is_member'] = db.group_members.count_documents({
            'group_id': group_id,
            'user_id': str(g.user['_id'])
        }) > 0
        
        # Get discussions
        discussions = list(db.group_discussions.find({'group_id': group_id}).sort('created_at', -1).limit(10))
        
        # Process discussions
        for discussion in discussions:
            discussion['_id'] = str(discussion['_id'])
            discussion['created_at'] = discussion['created_at'].isoformat()
            
            # Get author details
            author = db.users.find_one(
                {'_id': ObjectId(discussion['author_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            
            if author:
                discussion['author'] = {
                    'id': str(author['_id']),
                    'username': author['username'],
                    'name': author['name'],
                    'profile_picture': author['profile_picture']
                }
        
        group['discussions'] = discussions
        
        return jsonify({
            'status': 'success',
            'data': group
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get study group: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving study group'
        }), 500

@study_groups_bp.route('/<group_id>/join', methods=['POST'])
@token_required
@verification_required
def join_study_group(group_id):
    """Join a study group"""
    try:
        db = get_db()
        
        # Find study group by ID
        group = db.study_groups.find_one({'_id': ObjectId(group_id)})
        
        if not group:
            return jsonify({
                'status': 'error',
                'message': 'Study group not found'
            }), 404
        
        # Check if user is already a member
        existing_member = db.group_members.find_one({
            'group_id': group_id,
            'user_id': str(g.user['_id'])
        })
        
        if existing_member:
            return jsonify({
                'status': 'error',
                'message': 'You are already a member of this study group'
            }), 400
        
        # Check if group has reached maximum members
        if group.get('max_members'):
            member_count = db.group_members.count_documents({'group_id': group_id})
            if member_count >= group['max_members']:
                return jsonify({
                    'status': 'error',
                    'message': 'This study group has reached its maximum member limit'
                }), 400
        
        # Add user as a member
        member = {
            'group_id': group_id,
            'user_id': str(g.user['_id']),
            'role': 'member',
            'joined_at': datetime.utcnow()
        }
        
        db.group_members.insert_one(member)
        
        # Add notification for group creator
        notification = {
            'user_id': group['creator_id'],
            'type': 'group_join',
            'content': f"{g.user['name']} joined your study group: '{group['name']}'",
            'reference_id': group_id,
            'created_at': datetime.utcnow(),
            'is_read': False
        }
        
        db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': 'Successfully joined the study group'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in join study group: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while joining study group'
        }), 500

@study_groups_bp.route('/<group_id>/leave', methods=['POST'])
@token_required
@verification_required
def leave_study_group(group_id):
    """Leave a study group"""
    try:
        db = get_db()
        
        # Find study group by ID
        group = db.study_groups.find_one({'_id': ObjectId(group_id)})
        
        if not group:
            return jsonify({
                'status': 'error',
                'message': 'Study group not found'
            }), 404
        
        # Check if user is a member
        member = db.group_members.find_one({
            'group_id': group_id,
            'user_id': str(g.user['_id'])
        })
        
        if not member:
            return jsonify({
                'status': 'error',
                'message': 'You are not a member of this study group'
            }), 400
        
        # Check if user is the creator/admin
        if member['role'] == 'admin':
            # Count other admins
            admin_count = db.group_members.count_documents({
                'group_id': group_id,
                'role': 'admin',
                'user_id': {'$ne': str(g.user['_id'])}
            })
            
            if admin_count == 0:
                # Find another member to promote to admin
                other_member = db.group_members.find_one({
                    'group_id': group_id,
                    'user_id': {'$ne': str(g.user['_id'])}
                })
                
                if other_member:
                    # Promote member to admin
                    db.group_members.update_one(
                        {'_id': other_member['_id']},
                        {'$set': {'role': 'admin'}}
                    )
                else:
                    # No other members, delete the group
                    db.study_groups.delete_one({'_id': ObjectId(group_id)})
                    db.group_members.delete_many({'group_id': group_id})
                    db.group_discussions.delete_many({'group_id': group_id})
                    
                    return jsonify({
                        'status': 'success',
                        'message': 'You were the only member. Study group has been deleted.'
                    }), 200
        
        # Remove user from group
        db.group_members.delete_one({
            'group_id': group_id,
            'user_id': str(g.user['_id'])
        })
        
        # Add notification for group creator if user is not the creator
        if group['creator_id'] != str(g.user['_id']):
            notification = {
                'user_id': group['creator_id'],
                'type': 'group_leave',
                'content': f"{g.user['name']} left your study group: '{group['name']}'",
                'reference_id': group_id,
                'created_at': datetime.utcnow(),
                'is_read': False
            }
            
            db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': 'Successfully left the study group'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in leave study group: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while leaving study group'
        }), 500
