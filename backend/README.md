# CampusConnect Backend

A Flask-based backend API for CampusConnect application with MongoDB integration.

## Prerequisites

- Python 3.8+
- MongoDB Atlas account (or local MongoDB)

## Installation

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your MongoDB URI:
   ```plaintext
   MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database?retryWrites=true&w=majority
   ```

## Running the Application

1. Ensure your virtual environment is activated
2. Run the application:
   ```bash
   python run.py
   ```

The application will start on http://localhost:5000

## Available Endpoints

- `GET /` - API root with available endpoints
- `GET /doubts/questions` - Get all questions
- `POST /doubts/questions` - Create a new question
- `GET /users` - Get user information
- `GET /calendar` - Get calendar events
- `GET /notes` - Get notes
- `GET /feedback` - Get feedback

## Error Handling

The API includes proper error handling with JSON responses for:
- 404 Not Found
- 500 Internal Server Error

## API Documentation

Detailed API documentation is available at http://localhost:5000/docs