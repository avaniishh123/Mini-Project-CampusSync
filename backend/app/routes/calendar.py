# app/routes/calendar.py

from flask import Blueprint, request, jsonify
from app.db import get_db
from datetime import datetime
from bson.objectid import ObjectId

calendar_bp = Blueprint('calendar', __name__)

@calendar_bp.route('/events', methods=['GET'])
def get_events():
    db = get_db()
    events = db.events.find({})
    return jsonify({
        "status": "success",
        "data": [{
            "id": str(event['_id']),
            "title": event['title'],
            "start": event['start'].isoformat(),
            "end": event['end'].isoformat(),
            "description": event.get('description', '')
        } for event in events]
    }), 200

@calendar_bp.route('/events', methods=['POST'])
def create_event():
    data = request.get_json()
    required_fields = ['title', 'start', 'end']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        start = datetime.fromisoformat(data['start'])
        end = datetime.fromisoformat(data['end'])
        
        if start >= end:
            return jsonify({'error': 'End time must be after start time'}), 400
            
        db = get_db()
        event = {
            "title": data['title'],
            "start": start,
            "end": end,
            "description": data.get('description', '')
        }
        result = db.events.insert_one(event)
        return jsonify({'status': 'success', 'id': str(result.inserted_id)}), 201
    
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

@calendar_bp.route('/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    db = get_db()
    result = db.events.delete_one({"_id": ObjectId(event_id)})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Event not found'}), 404
        
    return jsonify({'status': 'success', 'message': 'Event deleted successfully'}), 204