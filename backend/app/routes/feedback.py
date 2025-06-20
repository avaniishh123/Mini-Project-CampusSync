# app/routes/feedback.py

from flask import Blueprint, request, jsonify
from app.db import get_db
from datetime import datetime
from bson import ObjectId

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/submit', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    required_fields = ['feedback_type', 'content']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    db = get_db()
    feedback = {
        "feedback_type": data['feedback_type'],
        "content": data['content'],
        "rating": data.get('rating'),
        "created_at": datetime.utcnow(),
        "resolved": False,
        "resolution_notes": None
    }
    
    result = db.feedback.insert_one(feedback)
    return jsonify({'status': 'success', 'id': str(result.inserted_id)}), 201

@feedback_bp.route('/list', methods=['GET'])
def list_feedback():
    db = get_db()
    feedback_list = db.feedback.find({"resolved": False})
    
    return jsonify({
        "status": "success",
        "data": [{
            "id": str(f['_id']),
            "feedback_type": f['feedback_type'],
            "content": f['content'],
            "rating": f.get('rating'),
            "created_at": f['created_at'].isoformat(),
            "resolved": f['resolved']
        } for f in feedback_list]
    }), 200

@feedback_bp.route('/resolve/<feedback_id>', methods=['PUT'])
def resolve_feedback(feedback_id):
    data = request.get_json()
    required_fields = ['resolution_notes']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    db = get_db()
    result = db.feedback.update_one(
        {"_id": ObjectId(feedback_id)},
        {
            "$set": {
                "resolved": True,
                "resolution_notes": data['resolution_notes'],
                "resolved_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        return jsonify({'error': 'Feedback not found'}), 404
    
    return jsonify({'status': 'success', 'message': 'Feedback resolved successfully'}), 200