# app/routes/files.py

from flask import Blueprint, request, send_file, Response, current_app, jsonify, g
from app.db import get_db, get_file_from_gridfs, get_binary_image
from app.routes.users import token_required, verification_required
from bson import ObjectId
from io import BytesIO
import logging
import os

logger = logging.getLogger(__name__)

files_bp = Blueprint('files', __name__, url_prefix='/api/files')

@files_bp.route('/image/<image_id>', methods=['GET'])
def get_image(image_id):
    """Serve an image from binary storage"""
    try:
        # Convert string ID to ObjectId
        try:
            image_id = ObjectId(image_id)
        except Exception as e:
            logger.error(f"Invalid image ID format: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid image ID format'
            }), 400
        
        # Get image from database
        image_doc = get_binary_image(image_id)
        
        if not image_doc:
            logger.error(f"Image not found with ID: {image_id}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404
        
        # Create file-like object from binary data
        image_data = BytesIO(image_doc['data'])
        
        # Get content type
        content_type = image_doc.get('content_type', 'image/jpeg')
        
        # Create response
        response = send_file(
            image_data,
            mimetype=content_type,
            as_attachment=False,
            download_name=image_doc.get('filename', 'image')
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        logger.error(f"Error serving image: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error serving image: {str(e)}'
        }), 500

@files_bp.route('/gridfs/<file_id>', methods=['GET'])
def get_gridfs_file(file_id):
    """Serve a file from GridFS"""
    try:
        # Convert string ID to ObjectId
        try:
            file_id = ObjectId(file_id)
        except Exception as e:
            logger.error(f"Invalid file ID format: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid file ID format'
            }), 400
        
        # Get file from GridFS
        gridfs_file = get_file_from_gridfs(file_id)
        
        if not gridfs_file:
            logger.error(f"File not found in GridFS with ID: {file_id}")
            return jsonify({
                'status': 'error',
                'message': 'File not found'
            }), 404
        
        # Create file-like object
        file_data = BytesIO(gridfs_file.read())
        
        # Get content type and filename
        content_type = gridfs_file.content_type
        filename = gridfs_file.filename
        
        # Determine if file should be downloaded or displayed inline
        as_attachment = request.args.get('download', 'false').lower() == 'true'
        
        # Create response
        response = send_file(
            file_data,
            mimetype=content_type,
            as_attachment=as_attachment,
            download_name=filename
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        logger.error(f"Error serving GridFS file: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error serving file: {str(e)}'
        }), 500
