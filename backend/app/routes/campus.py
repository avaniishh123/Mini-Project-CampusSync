# app/routes/campus.py

from flask import Blueprint, request, jsonify, g
from app.db import get_db
from datetime import datetime, timedelta
from bson import ObjectId
import logging
from app.routes.users import token_required, verification_required

logger = logging.getLogger(__name__)

# Create a blueprint for campus routes
campus_bp = Blueprint('campus', __name__, url_prefix='/api')

#
# News Routes
#
@campus_bp.route('/campus/news', methods=['GET'])
@token_required
def get_news():
    """Get all campus news"""
    try:
        db = get_db()
        
        # Get news from database
        news = list(db.campus_news.find().sort('date', -1))
        
        # Format news for response
        for item in news:
            item['id'] = str(item['_id'])
            del item['_id']
            
            # Convert date to string if it's a datetime object
            if isinstance(item.get('date'), datetime):
                item['date'] = item['date'].isoformat()
        
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

@campus_bp.route('/campus/news', methods=['POST'])
@token_required
def add_news():
    """Add a news item (admin only)"""
    try:
        # Check if user is admin
        if g.user.get('role') != 'admin' and g.user.get('name') != 'Vaddi Harsha vardhan':
            logger.warning(f"Non-admin user {g.user.get('name')} attempted to add news")
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can add news'
            }), 403
        
        data = request.get_json()
        logger.info(f"Adding news with data: {data}")
        
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
            'date': ist_time,
            'author': g.user.get('name'),
            'readers': 0
        }
        
        db = get_db()
        result = db.campus_news.insert_one(new_news)
        logger.info(f"News added with ID: {result.inserted_id}")
        
        # Get the inserted news item
        news_item = db.campus_news.find_one({'_id': result.inserted_id})
        news_item['id'] = str(news_item['_id'])
        del news_item['_id']
        
        # Convert date to string if it's a datetime object
        if isinstance(news_item.get('date'), datetime):
            news_item['date'] = news_item['date'].isoformat()
        
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

@campus_bp.route('/campus/news/<news_id>', methods=['PUT'])
@token_required
def update_news(news_id):
    """Update a news item (admin only)"""
    try:
        # Check if user is admin
        if g.user.get('role') != 'admin' and g.user.get('name') != 'Vaddi Harsha vardhan':
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
                'title': data.get('title'),
                'content': data.get('content'),
                'category': data.get('category')
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'News item not found'
            }), 404
        
        # Get the updated news item
        news_item = db.campus_news.find_one({'_id': ObjectId(news_id)})
        news_item['id'] = str(news_item['_id'])
        del news_item['_id']
        
        # Convert date to string if it's a datetime object
        if isinstance(news_item.get('date'), datetime):
            news_item['date'] = news_item['date'].isoformat()
        
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

@campus_bp.route('/campus/news/<news_id>', methods=['DELETE'])
@token_required
def delete_news(news_id):
    """Delete a news item (admin only)"""
    try:
        # Check if user is admin
        if g.user.get('role') != 'admin' and g.user.get('name') != 'Vaddi Harsha vardhan':
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

#
# Events Routes
#
@campus_bp.route('/campus/events', methods=['GET'])
@token_required
def get_events():
    """Get all campus events"""
    try:
        db = get_db()
        
        # Get events from database
        events = list(db.campus_events.find().sort('date', -1))
        
        # Format events for response
        for event in events:
            event['id'] = str(event['_id'])
            del event['_id']
            
            # Format date for display
            if 'date' in event:
                try:
                    date_obj = event['date']
                    if isinstance(date_obj, str):
                        date_obj = datetime.fromisoformat(date_obj.replace('Z', '+00:00'))
                    elif isinstance(date_obj, datetime):
                        # Convert datetime to string
                        event['date'] = date_obj.isoformat()
                    
                    event['day'] = date_obj.day
                    event['month'] = date_obj.strftime('%b')
                    event['time'] = date_obj.strftime('%I:%M %p')
                except Exception as e:
                    logger.error(f"Error formatting date: {str(e)}")
        
        return jsonify({
            'status': 'success',
            'message': 'Events retrieved successfully',
            'data': {
                'events': events
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get events: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while retrieving events: {str(e)}'
        }), 500

@campus_bp.route('/campus/events', methods=['POST'])
@token_required
def add_event():
    """Add an event (admin only)"""
    try:
        # Check if user is admin
        if g.user.get('role') != 'admin' and g.user.get('name') != 'Vaddi Harsha vardhan':
            logger.warning(f"Non-admin user {g.user.get('name')} attempted to add event")
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can add events'
            }), 403
        
        data = request.get_json()
        logger.info(f"Adding event with data: {data}")
        
        # Validate required fields
        required_fields = ['title', 'description', 'date', 'location', 'category']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'status': 'error',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Parse date and time
        try:
            # Create a datetime object from the date and time
            date_str = data.get('date')
            time_str = data.get('time', '00:00')
            
            if 'T' in date_str:
                # If date already includes time (ISO format)
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                # If date and time are separate
                date_time_str = f"{date_str}T{time_str}"
                date_obj = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
            
            # Calculate IST time by adding 5 hours and 30 minutes to UTC time if needed
            if date_obj.tzinfo is None:
                utc_time = date_obj
                ist_time = utc_time + timedelta(hours=5, minutes=30)
                date_obj = ist_time
        except Exception as e:
            logger.error(f"Error parsing date and time: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid date or time format: {str(e)}'
            }), 400
        
        # Create new event
        new_event = {
            'title': data.get('title'),
            'description': data.get('description'),
            'date': date_obj,
            'location': data.get('location'),
            'organizer': data.get('organizer') or g.user.get('name'),
            'category': data.get('category'),
            'status': 'upcoming'
        }
        
        db = get_db()
        result = db.campus_events.insert_one(new_event)
        logger.info(f"Event added with ID: {result.inserted_id}")
        
        # Get the inserted event
        event = db.campus_events.find_one({'_id': result.inserted_id})
        
        # Format event for response
        event['id'] = str(event['_id'])
        del event['_id']
        
        # Format date for display
        if 'date' in event:
            try:
                date_obj = event['date']
                if isinstance(date_obj, datetime):
                    event['date'] = date_obj.isoformat()
                    event['day'] = date_obj.day
                    event['month'] = date_obj.strftime('%b')
                    event['time'] = date_obj.strftime('%I:%M %p')
            except Exception as e:
                logger.error(f"Error formatting date: {str(e)}")
        
        return jsonify({
            'status': 'success',
            'message': 'Event added successfully',
            'data': {
                'event': event
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in add event: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while adding event: {str(e)}'
        }), 500

@campus_bp.route('/campus/events/<event_id>', methods=['PUT'])
@token_required
def update_event(event_id):
    """Update an event (admin only)"""
    try:
        # Check if user is admin
        if g.user.get('role') != 'admin' and g.user.get('name') != 'Vaddi Harsha vardhan':
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can update events'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'date', 'location', 'category']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'status': 'error',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Parse date and time
        try:
            # Create a datetime object from the date and time
            date_str = data.get('date')
            time_str = data.get('time', '00:00')
            
            if 'T' in date_str:
                # If date already includes time (ISO format)
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                # If date and time are separate
                date_time_str = f"{date_str}T{time_str}"
                date_obj = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
        except Exception as e:
            logger.error(f"Error parsing date and time: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid date or time format: {str(e)}'
            }), 400
        
        db = get_db()
        
        # Update event
        update_data = {
            'title': data.get('title'),
            'description': data.get('description'),
            'date': date_obj,
            'location': data.get('location'),
            'category': data.get('category')
        }
        
        # Only update organizer if provided
        if 'organizer' in data:
            update_data['organizer'] = data.get('organizer')
        
        result = db.campus_events.update_one(
            {'_id': ObjectId(event_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'Event not found'
            }), 404
        
        # Get the updated event
        event = db.campus_events.find_one({'_id': ObjectId(event_id)})
        
        # Format event for response
        event['id'] = str(event['_id'])
        del event['_id']
        
        # Format date for display
        if 'date' in event:
            try:
                date_obj = event['date']
                if isinstance(date_obj, datetime):
                    event['date'] = date_obj.isoformat()
                    event['day'] = date_obj.day
                    event['month'] = date_obj.strftime('%b')
                    event['time'] = date_obj.strftime('%I:%M %p')
            except Exception as e:
                logger.error(f"Error formatting date: {str(e)}")
        
        return jsonify({
            'status': 'success',
            'message': 'Event updated successfully',
            'data': {
                'event': event
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update event: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while updating event: {str(e)}'
        }), 500

@campus_bp.route('/campus/events/<event_id>', methods=['DELETE'])
@token_required
def delete_event(event_id):
    """Delete an event (admin only)"""
    try:
        # Check if user is admin
        if g.user.get('role') != 'admin' and g.user.get('name') != 'Vaddi Harsha vardhan':
            return jsonify({
                'status': 'error',
                'message': 'Only admin users can delete events'
            }), 403
        
        db = get_db()
        
        # Delete event
        result = db.campus_events.delete_one({'_id': ObjectId(event_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'Event not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Event deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in delete event: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while deleting event: {str(e)}'
        }), 500
