#!/bin/bash
# This file tells Render how to run the Flask application

# Run the application with Gunicorn
# - workers: number of worker processes
# - threads: number of threads per worker
# - timeout: worker timeout in seconds
# - bind: IP:PORT to bind to
exec gunicorn --workers=2 --threads=2 --timeout=60 --bind=0.0.0.0:$PORT "run:create_app()"
