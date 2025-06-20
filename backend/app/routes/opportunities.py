# app/routes/opportunities.py

from flask import Blueprint, request, jsonify, g, current_app
from app.db import get_db
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import os
import uuid
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from werkzeug.utils import secure_filename
from app.routes.users import token_required, verification_required, generate_verification_code

logger = logging.getLogger(__name__)

opportunities_bp = Blueprint('opportunities', __name__, url_prefix='/api/opportunities')

# Function to send email
def send_email(to_email, subject, body):
    """Send email using SMTP"""
    try:
        # Get email configuration from environment variables or config
        smtp_server = current_app.config.get('SMTP_SERVER', os.environ.get('SMTP_SERVER', 'smtp.gmail.com'))
        smtp_port = int(current_app.config.get('SMTP_PORT', os.environ.get('SMTP_PORT', 587)))
        smtp_username = current_app.config.get('SMTP_USERNAME', os.environ.get('SMTP_USERNAME', ''))
        smtp_password = current_app.config.get('SMTP_PASSWORD', os.environ.get('SMTP_PASSWORD', ''))
        sender_email = current_app.config.get('SENDER_EMAIL', os.environ.get('SENDER_EMAIL', smtp_username))
        
        # Validate email configuration
        if not all([smtp_username, smtp_password]):
            logger.error("Email credentials not configured. Check environment variables or app config.")
            # For development/testing, return True but log the verification code
            logger.info(f"Would have sent email to {to_email} with subject: {subject}")
            logger.info(f"Email body: {body}")
            return True
        
        # Create message
        message = MIMEMultipart()
        message['From'] = sender_email
        message['To'] = to_email
        message['Subject'] = subject
        
        # Add body to email
        message.attach(MIMEText(body, 'plain'))
        
        # Connect to server and send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(message)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

@opportunities_bp.route('/verify/send-code', methods=['POST'])
@token_required
def send_verification_code():
    """Send verification code to email for opportunity posting"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'email' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email is required'
            }), 400
        
        email = data['email']
        db = get_db()
        
        # Generate a 6-digit verification code
        verification_code = generate_verification_code()
        
        # Store verification code in database
        verification_data = {
            'code': verification_code,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=30),
            'verified': False
        }
        
        # Check if there's an existing verification record
        existing_verification = db.opportunity_verifications.find_one({'email': email})
        
        if existing_verification:
            # Update existing verification
            db.opportunity_verifications.update_one(
                {'email': email},
                {'$set': verification_data}
            )
        else:
            # Create new verification record
            verification_data['email'] = email
            db.opportunity_verifications.insert_one(verification_data)
        
        # Send verification code via email
        subject = "Verification Code for Opportunity Posting"
        body = f"""Hello,

Your verification code for posting an opportunity on CampusConnect is: {verification_code}

This code will expire in 30 minutes.

Thank you,
CampusConnect Team
"""
        
        # Attempt to send email
        email_sent = send_email(email, subject, body)
        
        if email_sent:
            return jsonify({
                'status': 'success',
                'message': 'Verification code sent successfully'
            }), 200
        else:
            # If email sending fails, still return success but with a note
            # For testing purposes, include the verification code in the response
            return jsonify({
                'status': 'success',
                'message': 'Email sending failed, but verification code created',
                'verification_code': verification_code  # For testing only, remove in production
            }), 200
    
    except Exception as e:
        logger.error(f"Error sending verification code: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while sending verification code'
        }), 500

@opportunities_bp.route('/verify/check-code', methods=['POST'])
@token_required
def verify_email_code():
    """Verify email with verification code for opportunity posting"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'email' not in data or 'verification_code' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email and verification code are required'
            }), 400
        
        email = data['email']
        verification_code = data['verification_code']
        db = get_db()
        
        # Find verification record
        verification = db.opportunity_verifications.find_one({'email': email})
        
        if not verification:
            return jsonify({
                'status': 'error',
                'message': 'No verification record found for this email'
            }), 404
        
        # Check if verification code has expired
        if datetime.utcnow() > verification.get('expires_at'):
            return jsonify({
                'status': 'error',
                'message': 'Verification code has expired'
            }), 400
        
        # Check if verification code matches
        if verification.get('code') != verification_code:
            return jsonify({
                'status': 'error',
                'message': 'Invalid verification code'
            }), 400
        
        # Mark email as verified
        db.opportunity_verifications.update_one(
            {'email': email},
            {'$set': {'verified': True}}
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Email verified successfully'
        }), 200
    
    except Exception as e:
        logger.error(f"Error verifying email: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while verifying email'
        }), 500

@opportunities_bp.route('', methods=['GET'])
@token_required
@verification_required
def get_opportunities():
    """Get all opportunities with optional filtering"""
    try:
        # Get query parameters
        opportunity_type = request.args.get('type')  # internship, freelance, etc.
        domain = request.args.get('domain')  # software, marketing, etc.
        is_paid = request.args.get('is_paid')  # true, false
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = int(request.args.get('sort_order', -1))  # -1 for descending, 1 for ascending
        limit = int(request.args.get('limit', 20))
        skip = int(request.args.get('skip', 0))
        
        # Build query
        query = {}
        
        if opportunity_type:
            query['type'] = opportunity_type
        
        if domain:
            query['domain'] = domain
        
        if is_paid is not None:
            query['is_paid'] = is_paid.lower() == 'true'
        
        if search:
            query['$or'] = [
                {'title': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'company': {'$regex': search, '$options': 'i'}},
                {'location': {'$regex': search, '$options': 'i'}},
                {'skills_required': {'$regex': search, '$options': 'i'}}
            ]
        
        # Only show active opportunities
        query['is_active'] = True
        
        db = get_db()
        
        # Get opportunities from database
        opportunities = list(db.opportunities.find(query).sort(sort_by, sort_order).skip(skip).limit(limit))
        
        # Process opportunities
        for opportunity in opportunities:
            opportunity['_id'] = str(opportunity['_id'])
            opportunity['created_at'] = opportunity['created_at'].isoformat()
            opportunity['deadline'] = opportunity['deadline'].isoformat() if 'deadline' in opportunity else None
            
            # Get poster details
            poster = db.users.find_one(
                {'_id': ObjectId(opportunity['poster_id'])},
                {'password_hash': 0, 'verification': 0, 'notifications': 0}
            )
            
            if poster:
                opportunity['poster'] = {
                    'id': str(poster['_id']),
                    'username': poster['username'],
                    'name': poster['name'],
                    'profile_picture': poster['profile_picture']
                }
            
            # Check if current user has applied
            opportunity['has_applied'] = db.applications.count_documents({
                'opportunity_id': opportunity['_id'],
                'applicant_id': str(g.user['_id'])
            }) > 0
            
            # Get application count
            opportunity['application_count'] = db.applications.count_documents({
                'opportunity_id': opportunity['_id']
            })
        
        # Get total count
        total_count = db.opportunities.count_documents(query)
        
        return jsonify({
            'status': 'success',
            'data': {
                'opportunities': opportunities,
                'total_count': total_count,
                'has_more': total_count > skip + limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get opportunities: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving opportunities'
        }), 500

@opportunities_bp.route('', methods=['POST'])
@token_required
def create_opportunity():
    """Create a new opportunity"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'type', 'domain', 'is_paid']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Validate opportunity type
        valid_types = ['internship', 'freelance', 'part_time', 'full_time', 'project']
        if data['type'] not in valid_types:
            return jsonify({
                'status': 'error',
                'message': f'Invalid opportunity type. Must be one of: {", ".join(valid_types)}'
            }), 400
        
        # Create new opportunity
        new_opportunity = {
            'title': data['title'],
            'description': data['description'],
            'type': data['type'],
            'domain': data['domain'],
            'is_paid': data['is_paid'],
            'compensation': data.get('compensation'),
            'company': data.get('company'),
            'location': data.get('location'),
            'remote': data.get('remote', False),
            'skills_required': data.get('skills_required', []),
            'requirements': data.get('requirements', []),
            'responsibilities': data.get('responsibilities', []),
            'application_instructions': data.get('application_instructions'),
            'application_form_url': data.get('application_form_url'),  # Add application form URL
            'deadline': datetime.fromisoformat(data['deadline']) if 'deadline' in data else None,
            'poster_id': str(g.user['_id']),
            'created_at': datetime.utcnow(),
            'is_active': True,
            'is_verified': g.user['role'] == 'admin'  # Only admin-posted opportunities are verified by default
        }
        
        db = get_db()
        result = db.opportunities.insert_one(new_opportunity)
        
        # If poster is not an admin, create a verification request
        if g.user['role'] != 'admin':
            verification_request = {
                'opportunity_id': str(result.inserted_id),
                'poster_id': str(g.user['_id']),
                'status': 'pending',
                'created_at': datetime.utcnow(),
                'reviewed_by': None,
                'reviewed_at': None,
                'feedback': None
            }
            
            db.verification_requests.insert_one(verification_request)
        
        return jsonify({
            'status': 'success',
            'message': 'Opportunity created successfully',
            'data': {
                'opportunity_id': str(result.inserted_id),
                'is_verified': g.user['role'] == 'admin'
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in create opportunity: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while creating opportunity'
        }), 500

@opportunities_bp.route('/<opportunity_id>', methods=['GET'])
@token_required
@verification_required
def get_opportunity(opportunity_id):
    """Get a specific opportunity"""
    try:
        db = get_db()
        
        # Find opportunity by ID
        opportunity = db.opportunities.find_one({'_id': ObjectId(opportunity_id)})
        
        if not opportunity:
            return jsonify({
                'status': 'error',
                'message': 'Opportunity not found'
            }), 404
        
        # Convert ObjectId to string
        opportunity['_id'] = str(opportunity['_id'])
        opportunity['created_at'] = opportunity['created_at'].isoformat()
        opportunity['deadline'] = opportunity['deadline'].isoformat() if 'deadline' in opportunity else None
        
        # Get poster details
        poster = db.users.find_one(
            {'_id': ObjectId(opportunity['poster_id'])},
            {'password_hash': 0, 'verification': 0, 'notifications': 0}
        )
        
        if poster:
            opportunity['poster'] = {
                'id': str(poster['_id']),
                'username': poster['username'],
                'name': poster['name'],
                'profile_picture': poster['profile_picture']
            }
        
        # Check if current user has applied
        opportunity['has_applied'] = db.applications.count_documents({
            'opportunity_id': opportunity_id,
            'applicant_id': str(g.user['_id'])
        }) > 0
        
        # Get application count
        opportunity['application_count'] = db.applications.count_documents({
            'opportunity_id': opportunity_id
        })
        
        # If current user is the poster or an admin, include applications
        if opportunity['poster_id'] == str(g.user['_id']) or g.user['role'] == 'admin':
            applications = list(db.applications.find({'opportunity_id': opportunity_id}))
            
            # Process applications
            for application in applications:
                application['_id'] = str(application['_id'])
                application['created_at'] = application['created_at'].isoformat()
                
                # Get applicant details
                applicant = db.users.find_one(
                    {'_id': ObjectId(application['applicant_id'])},
                    {'password_hash': 0, 'verification': 0, 'notifications': 0}
                )
                
                if applicant:
                    application['applicant'] = {
                        'id': str(applicant['_id']),
                        'username': applicant['username'],
                        'name': applicant['name'],
                        'email': applicant['email'],
                        'profile_picture': applicant['profile_picture']
                    }
            
            opportunity['applications'] = applications
        
        return jsonify({
            'status': 'success',
            'data': opportunity
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get opportunity: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while retrieving opportunity'
        }), 500

@opportunities_bp.route('/<opportunity_id>', methods=['PUT'])
@token_required
@verification_required
def update_opportunity(opportunity_id):
    """Update an opportunity"""
    try:
        data = request.get_json()
        
        db = get_db()
        
        # Find opportunity by ID
        opportunity = db.opportunities.find_one({'_id': ObjectId(opportunity_id)})
        
        if not opportunity:
            return jsonify({
                'status': 'error',
                'message': 'Opportunity not found'
            }), 404
        
        # Check if user is the poster of the opportunity or an admin
        if opportunity['poster_id'] != str(g.user['_id']) and g.user['role'] != 'admin':
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this opportunity'
            }), 403
        
        # Fields that can be updated
        allowed_fields = [
            'title', 'description', 'type', 'domain', 'is_paid', 'compensation',
            'company', 'location', 'remote', 'skills_required', 'requirements',
            'responsibilities', 'application_instructions', 'deadline', 'is_active'
        ]
        
        # Filter out fields that are not allowed to be updated
        update_fields = {k: v for k, v in data.items() if k in allowed_fields}
        
        # Convert deadline to datetime if present
        if 'deadline' in update_fields:
            update_fields['deadline'] = datetime.fromisoformat(update_fields['deadline'])
        
        # Update opportunity
        result = db.opportunities.update_one(
            {'_id': ObjectId(opportunity_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the opportunity'
            }), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Opportunity updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update opportunity: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating opportunity'
        }), 500

@opportunities_bp.route('/<opportunity_id>', methods=['DELETE'])
@token_required
@verification_required
def delete_opportunity(opportunity_id):
    """Delete an opportunity"""
    try:
        db = get_db()
        
        # Find opportunity by ID
        opportunity = db.opportunities.find_one({'_id': ObjectId(opportunity_id)})
        
        if not opportunity:
            return jsonify({
                'status': 'error',
                'message': 'Opportunity not found'
            }), 404
        
        # Check if user is the poster of the opportunity or an admin
        if opportunity['poster_id'] != str(g.user['_id']) and g.user['role'] != 'admin':
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to delete this opportunity'
            }), 403
        
        # Delete opportunity
        db.opportunities.delete_one({'_id': ObjectId(opportunity_id)})
        
        # Delete associated applications
        db.applications.delete_many({'opportunity_id': opportunity_id})
        
        # Delete associated verification requests
        db.verification_requests.delete_many({'opportunity_id': opportunity_id})
        
        return jsonify({
            'status': 'success',
            'message': 'Opportunity deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in delete opportunity: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while deleting opportunity'
        }), 500

@opportunities_bp.route('/<opportunity_id>/apply', methods=['POST'])
@token_required
@verification_required
def apply_opportunity(opportunity_id):
    """Apply to an opportunity"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'cover_letter' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Cover letter is required'
            }), 400
        
        db = get_db()
        
        # Find opportunity by ID
        opportunity = db.opportunities.find_one({'_id': ObjectId(opportunity_id)})
        
        if not opportunity:
            return jsonify({
                'status': 'error',
                'message': 'Opportunity not found'
            }), 404
        
        # Check if opportunity is active
        if not opportunity.get('is_active', False):
            return jsonify({
                'status': 'error',
                'message': 'This opportunity is no longer active'
            }), 400
        
        # Check if opportunity is verified
        if not opportunity.get('is_verified', False):
            return jsonify({
                'status': 'error',
                'message': 'This opportunity has not been verified yet'
            }), 400
        
        # Check if user has already applied
        existing_application = db.applications.find_one({
            'opportunity_id': opportunity_id,
            'applicant_id': str(g.user['_id'])
        })
        
        if existing_application:
            return jsonify({
                'status': 'error',
                'message': 'You have already applied to this opportunity'
            }), 400
        
        # Create new application
        new_application = {
            'opportunity_id': opportunity_id,
            'applicant_id': str(g.user['_id']),
            'cover_letter': data['cover_letter'],
            'resume_url': data.get('resume_url'),
            'portfolio_url': data.get('portfolio_url'),
            'additional_info': data.get('additional_info'),
            'status': 'pending',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = db.applications.insert_one(new_application)
        
        # Add notification for opportunity poster
        notification = {
            'user_id': opportunity['poster_id'],
            'type': 'application',
            'content': f"New application for your opportunity: '{opportunity['title']}'",
            'reference_id': str(result.inserted_id),
            'opportunity_id': opportunity_id,
            'created_at': datetime.utcnow(),
            'is_read': False
        }
        
        db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': 'Application submitted successfully',
            'data': {
                'application_id': str(result.inserted_id)
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in apply opportunity: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while applying to opportunity'
        }), 500

@opportunities_bp.route('/applications/<application_id>/status', methods=['PUT'])
@token_required
@verification_required
def update_application_status(application_id):
    """Update application status"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'status' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Application status is required'
            }), 400
        
        # Validate status
        valid_statuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted']
        if data['status'] not in valid_statuses:
            return jsonify({
                'status': 'error',
                'message': f'Invalid application status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        db = get_db()
        
        # Find application by ID
        application = db.applications.find_one({'_id': ObjectId(application_id)})
        
        if not application:
            return jsonify({
                'status': 'error',
                'message': 'Application not found'
            }), 404
        
        # Find opportunity
        opportunity = db.opportunities.find_one({'_id': ObjectId(application['opportunity_id'])})
        
        if not opportunity:
            return jsonify({
                'status': 'error',
                'message': 'Opportunity not found'
            }), 404
        
        # Check if user is the poster of the opportunity or an admin
        if opportunity['poster_id'] != str(g.user['_id']) and g.user['role'] != 'admin':
            return jsonify({
                'status': 'error',
                'message': 'You are not authorized to update this application'
            }), 403
        
        # Update application status
        update_fields = {
            'status': data['status'],
            'feedback': data.get('feedback'),
            'updated_at': datetime.utcnow()
        }
        
        result = db.applications.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({
                'status': 'error',
                'message': 'No changes were made to the application'
            }), 400
        
        # Add notification for applicant
        notification = {
            'user_id': application['applicant_id'],
            'type': 'application_status',
            'content': f"Your application for '{opportunity['title']}' has been {data['status']}",
            'reference_id': application_id,
            'opportunity_id': application['opportunity_id'],
            'created_at': datetime.utcnow(),
            'is_read': False
        }
        
        db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': 'Application status updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update application status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while updating application status'
        }), 500

@opportunities_bp.route('/verify/<opportunity_id>', methods=['POST'])
@token_required
@verification_required
def verify_opportunity(opportunity_id):
    """Verify an opportunity (admin only)"""
    try:
        # Check if user is an admin
        if g.user['role'] != 'admin':
            return jsonify({
                'status': 'error',
                'message': 'Only administrators can verify opportunities'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        if 'is_verified' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Verification status is required'
            }), 400
        
        db = get_db()
        
        # Find opportunity by ID
        opportunity = db.opportunities.find_one({'_id': ObjectId(opportunity_id)})
        
        if not opportunity:
            return jsonify({
                'status': 'error',
                'message': 'Opportunity not found'
            }), 404
        
        # Update opportunity verification status
        db.opportunities.update_one(
            {'_id': ObjectId(opportunity_id)},
            {'$set': {'is_verified': data['is_verified']}}
        )
        
        # Update verification request
        verification_request = db.verification_requests.find_one({'opportunity_id': opportunity_id})
        
        if verification_request:
            db.verification_requests.update_one(
                {'_id': verification_request['_id']},
                {
                    '$set': {
                        'status': 'approved' if data['is_verified'] else 'rejected',
                        'reviewed_by': str(g.user['_id']),
                        'reviewed_at': datetime.utcnow(),
                        'feedback': data.get('feedback')
                    }
                }
            )
        
        # Add notification for opportunity poster
        notification = {
            'user_id': opportunity['poster_id'],
            'type': 'opportunity_verification',
            'content': f"Your opportunity '{opportunity['title']}' has been {'verified' if data['is_verified'] else 'rejected'}",
            'reference_id': opportunity_id,
            'created_at': datetime.utcnow(),
            'is_read': False
        }
        
        db.notifications.insert_one(notification)
        
        return jsonify({
            'status': 'success',
            'message': f"Opportunity {'verified' if data['is_verified'] else 'rejected'} successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error in verify opportunity: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while verifying opportunity'
        }), 500
