# app/routes/__init__.py

from flask import Blueprint
from .users import users_bp
from .campus_news import campus_news_bp
from .social_feed import social_feed_bp
from .campus_events import campus_events_bp
from .campus import campus_bp
from .ai_tools import ai_tools_bp
from .resources import resources_bp
from .opportunities import opportunities_bp
from .doubts import doubts_bp
from .feedback import feedback_bp
from .calendar import calendar_bp
from .internships import internships_bp
from .marketplace import marketplace_bp
from .notes import notes_bp
from .study_groups import study_groups_bp
from .summarize import summarize_bp

def init_app(app):
    """Initialize application with blueprints."""
    app.register_blueprint(users_bp)
    app.register_blueprint(campus_news_bp)
    app.register_blueprint(social_feed_bp)
    app.register_blueprint(campus_events_bp)
    app.register_blueprint(campus_bp)
    app.register_blueprint(ai_tools_bp)
    app.register_blueprint(resources_bp)
    app.register_blueprint(opportunities_bp)
    app.register_blueprint(doubts_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(internships_bp)
    app.register_blueprint(marketplace_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(study_groups_bp)
    app.register_blueprint(summarize_bp)

    # Enable CORS for all routes
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Log registered routes
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Registered routes:")
    for rule in app.url_map.iter_rules():
        logger.info(f"{rule.endpoint}: {rule}")

