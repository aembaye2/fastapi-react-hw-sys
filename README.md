# QuizAPI - Interactive Quiz Platform

A full-stack application built with FastAPI backend and React frontend for creating, managing, and taking quizzes.

## Features

- **User Authentication**: Register, login, and manage user profiles
- **Quiz Management**: Create, edit, and delete quizzes
- **Question Bank**: Add various types of questions to quizzes
- **Quiz Attempts**: Track user attempts and performance
- **Admin Dashboard**: Manage users and content
- **Responsive UI**: Modern interface that works on all devices

## Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **MongoDB**: NoSQL database for flexible data storage
- **JWT Authentication**: Secure user authentication
- **Pydantic**: Data validation and settings management

### Frontend
- **React**: UI library for building interactive user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API requests
- **React Router**: Navigation for single-page applications

## Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- MongoDB (or MongoDB Atlas account)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/QuizAPI-FastAPI-Backend.git
   cd QuizAPI-FastAPI-Backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Unix or MacOS
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   cd quizapi
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URL=your_mongodb_connection_string
   MONGODB_DATABASE=quizdb
   SECRET_KEY=your_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   DEBUG=true
   ENVIRONMENT=development
   FRONTEND_URL=http://localhost:3000
   ```

5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd quizapi/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following settings:
   - **Name**: quizapi-backend (or your preferred name)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r quizapi/requirements.txt`
   - **Start Command**: `cd quizapi && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: (leave empty)

4. Add the following environment variables:
   ```
   MONGODB_URL=your_mongodb_connection_string
   MONGODB_DATABASE=quizdb
   SECRET_KEY=your_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   DEBUG=false
   ENVIRONMENT=production
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

5. For MongoDB Atlas connectivity, you may need to:
   - Ensure your MongoDB Atlas cluster allows connections from Render's IP addresses
   - Update your connection string to include proper SSL configuration:
     ```
     MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/quizdb?retryWrites=true&w=majority&ssl=true&ssl_cert_reqs=CERT_NONE
     ```

### Frontend Deployment (Vercel)

1. Create a new project on Vercel
2. Connect your GitHub repository
3. Configure the following:
   - **Framework Preset**: Vite
   - **Root Directory**: quizapi/frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: dist

4. Add the following environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
   ```

## Troubleshooting Deployment Issues

### CORS Errors

If you're experiencing CORS errors after deployment, check that:

1. Your backend's CORS configuration is correctly set up to allow your frontend domain:
   ```python
   # In app/main.py
   frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
   
   origins = [
       "http://localhost:3000",
       frontend_url,
   ]
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=origins,  # Use the list instead of ["*"] for production
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. Your frontend is using the correct API URL (check `.env` files)

### MongoDB Connection Issues

If you're experiencing MongoDB connection errors:

1. Ensure your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0) during testing
2. Check if your MongoDB Atlas cluster requires a specific MongoDB version
3. Update the connection string to include proper SSL parameters:
   ```
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/quizdb?retryWrites=true&w=majority&tls=true
   ```

## API Documentation

When the backend is running, you can access the Swagger UI documentation at:
- Local: http://localhost:8000/docs
- Deployed: https://your-backend-url.onrender.com/docs

## License

[MIT](LICENSE)
