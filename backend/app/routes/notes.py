# app/routes/notes.py

from flask import Blueprint, request, jsonify
from app.db import get_db
from datetime import datetime
from bson import ObjectId

notes_bp = Blueprint('notes', __name__)

@notes_bp.route('/upload', methods=['POST'])
def upload_note():
    data = request.get_json()
    required_fields = ['title', 'content', 'subject', 'year']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    db = get_db()
    note = {
        "title": data['title'],
        "content": data['content'],
        "subject": data['subject'],
        "year": data['year'],
        "tags": data.get('tags', []),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "views": 0,
        "downloads": 0,
        "upvotes": 0,
        "downvotes": 0
    }
    
    result = db.notes.insert_one(note)
    return jsonify({'status': 'success', 'id': str(result.inserted_id)}), 201

@notes_bp.route('/<note_id>', methods=['GET'])
def get_note(note_id):
    db = get_db()
    note = db.notes.find_one({"_id": ObjectId(note_id)})
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Increment views
    db.notes.update_one(
        {"_id": ObjectId(note_id)},
        {"$inc": {"views": 1}}
    )
    
    return jsonify({
        "status": "success",
        "data": {
            "id": str(note['_id']),
            "title": note['title'],
            "content": note['content'],
            "subject": note['subject'],
            "year": note['year'],
            "tags": note['tags'],
            "created_at": note['created_at'].isoformat(),
            "updated_at": note['updated_at'].isoformat(),
            "views": note['views'],
            "downloads": note['downloads'],
            "upvotes": note['upvotes'],
            "downvotes": note['downvotes']
        }
    }), 200

@notes_bp.route('/search', methods=['GET'])
def search_notes():
    query = request.args.get('q', '')
    subject = request.args.get('subject')
    year = request.args.get('year')
    
    db = get_db()
    query_filter = {}
    
    if query:
        query_filter['$text'] = {'$search': query}
    if subject:
        query_filter['subject'] = subject
    if year:
        query_filter['year'] = year
    
    notes = db.notes.find(query_filter)
    return jsonify({
        "status": "success",
        "data": [{
            "id": str(note['_id']),
            "title": note['title'],
            "subject": note['subject'],
            "year": note['year'],
            "views": note['views'],
            "downloads": note['downloads'],
            "upvotes": note['upvotes']
        } for note in notes]
    }), 200