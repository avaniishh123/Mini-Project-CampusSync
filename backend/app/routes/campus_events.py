# app/routes/campus_events.py

from flask import Blueprint, request, jsonify, g
from app.db import get_db
from datetime import datetime, timedelta
from bson import ObjectId
import logging
from app.routes.users import token_required, verification_required

logger = logging.getLogger(__name__)

campus_events_bp = Blueprint('campus_events', __name__, url_prefix='/api/campus/events')

@campus_events_bp.route('', methods=['GET'])
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

@campus_events_bp.route('', methods=['POST'])
@token_required
def add_event():
    """Add an event (admin only)"""
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
                'message': 'Only admin users can add events'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'date', 'time', 'location', 'category']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': f'Missing required fields: {", ".join(required_fields)}'
            }), 400
        
        # Parse date and time
        try:
            # Create a datetime object from the date and time
            date_str = data.get('date')
            time_str = data.get('time')
            
            # Log the received date and time for debugging
            logger.info(f"Received date: {date_str}, time: {time_str}")
            
            # Handle various date formats
            if date_str and 'T' in date_str:
                # If date already includes time (ISO format)
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            elif date_str and time_str:
                # If date and time are separate
                # Make sure we have the correct format for date (YYYY-MM-DD)
                if '-' not in date_str:
                    # Try to parse other formats
                    try:
                        from dateutil import parser
                        parsed_date = parser.parse(date_str)
                        date_str = parsed_date.strftime('%Y-%m-%d')
                    except:
                        # If parsing fails, use the original string
                        pass
                
                date_time_str = f"{date_str}T{time_str}"
                try:
                    date_obj = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
                except ValueError:
                    # Try alternative parsing if the standard format fails
                    from dateutil import parser
                    date_obj = parser.parse(f"{date_str} {time_str}")
            else:
                # If we don't have proper date/time, use current time
                date_obj = datetime.utcnow()
            
            # Calculate IST time by adding 5 hours and 30 minutes to UTC time if needed
            if date_obj.tzinfo is None:
                utc_time = date_obj
                ist_time = utc_time + timedelta(hours=5, minutes=30)
                date_obj = ist_time
                
            logger.info(f"Parsed date object: {date_obj}")
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
        
        # Get the inserted event
        event = db.campus_events.find_one({'_id': result.inserted_id})
        
        # Format event for response
        event['id'] = str(event['_id'])
        del event['_id']
        
        # Format date for display
        if 'date' in event:
            try:
                date_obj = event['date']
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

@campus_events_bp.route('/<event_id>', methods=['PUT'])
@token_required
def update_event(event_id):
    """Update an event (admin only)"""
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
                'message': 'Only admin users can update events'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'date', 'location', 'category']
        if not all(field in data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': f'Missing required fields: {", ".join(required_fields)}'
            }), 400
        
        # Parse date and time
        try:
            # Create a datetime object from the date and time
            date_str = data.get('date')
            time_str = data.get('time', '00:00')
            
            # Log the received date and time for debugging
            logger.info(f"Update - Received date: {date_str}, time: {time_str}")
            
            # Handle various date formats
            if date_str and 'T' in date_str:
                # If date already includes time (ISO format)
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            elif date_str and time_str:
                # If date and time are separate
                # Make sure we have the correct format for date (YYYY-MM-DD)
                if '-' not in date_str:
                    # Try to parse other formats
                    try:
                        from dateutil import parser
                        parsed_date = parser.parse(date_str)
                        date_str = parsed_date.strftime('%Y-%m-%d')
                    except:
                        # If parsing fails, use the original string
                        pass
                
                date_time_str = f"{date_str}T{time_str}"
                try:
                    date_obj = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
                except ValueError:
                    # Try alternative parsing if the standard format fails
                    from dateutil import parser
                    date_obj = parser.parse(f"{date_str} {time_str}")
            else:
                # If we don't have proper date/time, use current time
                date_obj = datetime.utcnow()
            
            # Calculate IST time by adding 5 hours and 30 minutes to UTC time if needed
            if date_obj.tzinfo is None:
                utc_time = date_obj
                ist_time = utc_time + timedelta(hours=5, minutes=30)
                date_obj = ist_time
                
            logger.info(f"Update - Parsed date object: {date_obj}")
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

@campus_events_bp.route('/<event_id>', methods=['DELETE'])
@token_required
def delete_event(event_id):
    """Delete an event (admin only)"""
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
