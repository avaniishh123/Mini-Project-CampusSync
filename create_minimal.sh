#!/bin/bash
# Script to create a minimal version of the project for Replit

# Create a new directory for the minimal project
mkdir -p CampusSync-Minimal/backend
mkdir -p CampusSync-Minimal/backend/app
mkdir -p CampusSync-Minimal/backend/app/routes
mkdir -p CampusSync-Minimal/backend/static

# Copy only essential backend files
cp -r backend/app/__init__.py CampusSync-Minimal/backend/app/
cp -r backend/app/config.py CampusSync-Minimal/backend/app/
cp -r backend/app/db.py CampusSync-Minimal/backend/app/
cp -r backend/app/middleware.py CampusSync-Minimal/backend/app/
cp -r backend/app/utils.py CampusSync-Minimal/backend/app/
cp -r backend/app/routes/__init__.py CampusSync-Minimal/backend/app/routes/
cp -r backend/app/routes/users.py CampusSync-Minimal/backend/app/routes/
cp -r backend/app/routes/social_feed.py CampusSync-Minimal/backend/app/routes/
cp -r backend/run.py CampusSync-Minimal/backend/
cp -r backend/requirements.txt CampusSync-Minimal/backend/
cp -r backend/static/test.html CampusSync-Minimal/backend/static/

# Copy configuration files
cp .replit CampusSync-Minimal/
cp render.yaml CampusSync-Minimal/
cp README.md CampusSync-Minimal/

# Create a new git repo
cd CampusSync-Minimal
git init
git add .
git commit -m "Initial commit of minimal CampusSync for Replit"

echo "Created minimal version of CampusSync in ./CampusSync-Minimal"
echo "Now create a new GitHub repository and push this code to it."
