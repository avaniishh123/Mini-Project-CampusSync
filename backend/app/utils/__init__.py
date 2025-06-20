# app/__init__.py

from flask import Flask
from .routes import register_routes # type: ignore

def create_app():
    app = Flask(__name__)
    register_routes(app)
    return app
