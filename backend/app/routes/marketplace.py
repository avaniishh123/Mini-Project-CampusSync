from flask import Blueprint, request, jsonify
from app.db import get_db
from datetime import datetime

marketplace_bp = Blueprint('marketplace', __name__)

@marketplace_bp.route('/items', methods=['GET'])
def list_items():
    # Placeholder for marketplace items
    items = [
        {"id": 1, "name": "Textbook", "price": 50, "description": "Used textbook in good condition."},
        {"id": 2, "name": "Calculator", "price": 20, "description": "Scientific calculator for sale."}
    ]
    return jsonify({"status": "success", "data": items}), 200
