# app/routes/summarize.py

from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin  # Add this import
import os
import google.generativeai as genai
import logging
from app.routes.users import token_required
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

summarize_bp = Blueprint('summarize', __name__, url_prefix='/api/summarize')

def initialize_gemini():
    """Initialize the Gemini API with the API key from environment variables"""
    try:
        # Get API key from environment variables
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment variables")
            return None
        
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        try:
            # Use the exact model name from the working curl request
            model = genai.GenerativeModel('gemini-2.0-flash')
            return model
        except Exception as model_error:
            logger.error(f"Failed to create Gemini model instance: {str(model_error)}")
            return None
            
    except Exception as e:
        logger.error(f"Error initializing Gemini API: {str(e)}")
        return None

@summarize_bp.route('/text', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def summarize_text():
    """Summarize text using Gemini API"""
    try:
        # Initialize Gemini and get model instance
        model = initialize_gemini()
        if not model:
            return jsonify({
                'status': 'error',
                'message': 'Failed to initialize Gemini API. Please check the configuration.'
            }), 500
        
        # Get text to summarize from request
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No text provided for summarization'
            }), 400
        
        text = data['text'].strip()
        
        try:
            # Format the request exactly like the working curl request
            contents = [{
                "parts": [{
                    "text": f"Summarize this text in 2-3 sentences: {text}"
                }]
            }]
            
            # Generate the summary using the matching format
            response = model.generate_content(
                contents,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 200,
                }
            )
            
            if not response:
                logger.error("Empty response from Gemini API")
                raise Exception("No response from summarization service")
            
            summary = response.text.strip()
            if not summary:
                logger.error("Empty summary generated")
                raise Exception("Generated summary is empty")
            
            return jsonify({
                'status': 'success',
                'message': 'Text summarized successfully',
                'data': {
                    'summary': summary
                }
            }), 200
            
        except Exception as model_error:
            logger.error(f"Model error: {str(model_error)}")
            return jsonify({
                'status': 'error',
                'message': f'Failed to generate summary: {str(model_error)}'
            }), 500
        
    except Exception as e:
        logger.error(f"Error summarizing text: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while processing your request'
        }), 500
