#!/bin/bash

# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Build the production version of the frontend
npm run build

# Navigate back to the root directory
cd ..

# Start the backend server (which will serve both the API and the frontend)
cd backend && python run.py
