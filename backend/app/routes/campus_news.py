# app/routes/campus_news.py

from flask import Blueprint, request, jsonify, g
from app.db import get_db
from datetime import datetime, timedelta
from bson import ObjectId
import logging
from app.routes.users import token_required, verification_required

logger = logging.getLogger(__name__)

campus_news_bp = Blueprint('campus_news', __name__, url_prefix='/api/campus/news')

@campus_news_bp.route('', methods=['GET'])
@token_required
def get_news():
    """Get all campus news"""
    try:
        db = get_db()
        user_id = str(g.user['_id'])
        
        # Get news from database
        news = list(db.campus_news.find().sort('date', -1))
        
        # Format news for response
        for item in news:
            item['id'] = str(item['_id'])
            del item['_id']
            
            # Convert date to IST (UTC+5:30)
            if isinstance(item.get('date'), datetime):
                ist_time = item['date'] + timedelta(hours=5, minutes=30)
                item['date'] = ist_time.isoformat()
            
            # Update reader count if user hasn't read this news item
            if user_id not in item.get('read_by', []):
                db.campus_news.update_one(
                    {'_id': ObjectId(item['id'])},
                    {
                        '$inc': {'readers': 1},
                        '$addToSet': {'read_by': user_id}
                    }
                )
                item['readers'] = item.get('readers', 0) + 1
        
        return jsonify({
            'status': 'success',
            'message': 'News retrieved successfully',
            'data': {
                'news': news
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get news: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while retrieving news: {str(e)}'
        }), 500

@campus_news_bp.route('', methods=['POST'])
@token_required
def add_news():
    """Add a news item (admin only)"""
    try:
        # Check if user is admin
        # More flexible check for admin status by name
        is_admin_by_name = (
            g.user.get('name') == 'Vaddi Harsha vardhan' or 
            (g.user.get('name') and 'Vaddi' in g.user.get('name') and 'Harsha' in g.user.get('name')) or
            g.user.get('username') == 'vaddiharsha'
        )
        
        if g.user.get('role') != 'admin' and not is_admin_by_name:
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can add news'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not all([data.get('title'), data.get('content'), data.get('category')]):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: title, content, and category are required'
            }), 400
        
        # Create new news item
        # Calculate IST time by adding 5 hours and 30 minutes to UTC time
        utc_time = datetime.utcnow()
        ist_time = utc_time + timedelta(hours=5, minutes=30)
        
        new_news = {
            'title': data.get('title'),
            'content': data.get('content'),
            'category': data.get('category'),
            'date': utc_time,  # Store in UTC
            'author': g.user.get('name'),
            'readers': 0,
            'read_by': []  # Initialize empty list of readers
        }
        
        db = get_db()
        result = db.campus_news.insert_one(new_news)
        
        # Get the inserted news item
        news_item = db.campus_news.find_one({'_id': result.inserted_id})
        news_item['id'] = str(news_item['_id'])
        del news_item['_id']
        
        # Convert date to IST for response
        if isinstance(news_item.get('date'), datetime):
            ist_time = news_item['date'] + timedelta(hours=5, minutes=30)
            news_item['date'] = ist_time.isoformat()
        
        return jsonify({
            'status': 'success',
            'message': 'News added successfully',
            'data': {
                'news': news_item
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in add news: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while adding news: {str(e)}'
        }), 500

@campus_news_bp.route('/<news_id>', methods=['PUT'])
@token_required
def update_news(news_id):
    """Update a news item (admin only)"""
    try:
        # Flexible admin check (by name/username or role)
        is_admin_by_name = (
            g.user.get('name') == 'Vaddi Harsha vardhan' or 
            (g.user.get('name') and 'Vaddi' in g.user.get('name') and 'Harsha' in g.user.get('name')) or
            g.user.get('username') == 'vaddiharsha'
        )
        if g.user.get('role') != 'admin' and not is_admin_by_name:
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can update news'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not all([data.get('title'), data.get('content'), data.get('category')]):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: title, content, and category are required'
            }), 400
        
        db = get_db()
        
        # Update news item
        result = db.campus_news.update_one(
            {'_id': ObjectId(news_id)},
            {'$set': {
                'title': data['title'],
                'content': data['content'],
                'category': data['category'],
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'News item not found or no changes made'
            }), 404
        
        # Get the updated news item
        news_item = db.campus_news.find_one({'_id': ObjectId(news_id)})
        news_item['id'] = str(news_item['_id'])
        del news_item['_id']
        
        # Convert date to IST for response
        if isinstance(news_item.get('date'), datetime):
            ist_time = news_item['date'] + timedelta(hours=5, minutes=30)
            news_item['date'] = ist_time.isoformat()
        
        return jsonify({
            'status': 'success',
            'message': 'News updated successfully',
            'data': {
                'news': news_item
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update news: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while updating news: {str(e)}'
        }), 500

@campus_news_bp.route('/<news_id>', methods=['DELETE'])
@token_required
def delete_news(news_id):
    """Delete a news item (admin only)"""
    try:
        # Flexible admin check (by name/username or role)
        is_admin_by_name = (
            g.user.get('name') == 'Vaddi Harsha vardhan' or 
            (g.user.get('name') and 'Vaddi' in g.user.get('name') and 'Harsha' in g.user.get('name')) or
            g.user.get('username') == 'vaddiharsha'
        )
        if g.user.get('role') != 'admin' and not is_admin_by_name:
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can delete news'
            }), 403
        
        db = get_db()
        
        # Delete news item
        result = db.campus_news.delete_one({'_id': ObjectId(news_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'News item not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'News deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in delete news: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while deleting news: {str(e)}'
        }), 500
