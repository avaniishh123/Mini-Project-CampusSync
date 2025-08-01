# Mini-Project-CampusSync

A comprehensive campus management platform with social networking, resource sharing, and campus news features.

## Project Structure

- **Frontend**: React/TypeScript application with Tailwind CSS
- **Backend**: Python Flask API with MongoDB database

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

### Environment Variables Setup

1. Backend environment:
   ```bash
   # Copy the example env file
   cp backend/.env.example backend/.env
   # Edit the .env file with your actual credentials
   ```

2. Chatbot environment:
   ```bash
   # Copy the example env file
   cp backend/chatbot/.env.example backend/chatbot/.env
   # Add your OpenAI and Gemini API keys to the .env file
   ```

3. Start the backend server:
   ```bash
   python run.py
   ```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Deployment

This project is configured for deployment on Render using the `render.yaml` file in the root directory.

### Deployment Steps

1. **GitHub Repository**:
   - Ensure your code is pushed to GitHub
   - The repository should contain the `render.yaml` file in the root directory

2. **Render Setup**:
   - Create an account on [Render](https://render.com/)
   - Select "New" > "Blueprint" from the dashboard
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file and create the services

3. **Environment Variables**:
   - After the services are created, navigate to each service's "Environment" tab
   - Add all the environment variables from your local `.env` files:
     - For backend: MongoDB URI, JWT secret key, API keys, etc.
     - For frontend: API URL (pointing to your deployed backend service)

4. **Database Setup**:
   - Create a MongoDB Atlas cluster if you don't have one
   - Add your MongoDB connection string to the backend service environment variables

5. **Documentation**:
   - Refer to the detailed project report below to understand the complete working, architecture, and flow of CampusSync.
   - It covers everything from code structure, feature implementation, to user interaction flow and deployment steps.
   
   Documentation Link:- [CampusSync-NEW-REPORT-UPDATED-2.pdf](https://github.com/user-attachments/files/21545597/CampusSync-NEW-REPORT-UPDATED-2.pdf)

5. **Verify Deployment**:
   - Once deployed, check both frontend and backend logs for any errors
   - Test the application functionality to ensure everything is working
