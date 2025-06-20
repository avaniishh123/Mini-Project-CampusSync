from flask import Blueprint, request, jsonify
from app.db import get_db
from datetime import datetime

internships_bp = Blueprint('internships', __name__)

@internships_bp.route('/list', methods=['GET'])
def list_internships():
    # Placeholder for internship listings
    internships = [
        {"id": 1, "title": "Software Developer Intern", "company": "Tech Corp", "location": "Remote", "description": "Join our team as a software developer intern."},
        {"id": 2, "title": "Data Analyst Intern", "company": "Data Inc", "location": "New York", "description": "Work with data analysis and visualization."}
    ]
    return jsonify({"status": "success", "data": internships}), 200
