## Zhiwa CTG - Backend API Server

### Purpose
The Zhiwa-CTG Backend is a Node.js/Express server that powers the Zhiwa-CTG system. It handles CTG image uploads, AI classification requests, user authentication, and admin management. The backend provides a secure and reliable API for the frontend to support fast and accurate maternal and fetal health assessment through an AI-powered system.

### Features
- User Management: Login, registration, and profile management

- Admin Management: Super Admin and Admin CRUD operations

- CTG Scans: Upload, retrieve, and classify CTG images

- Security: JWT-based authentication, middleware protection

- Cloud Storage: Images uploaded to Cloudinary

- Email Service: Gmail integration for notifications and OTP

- Standardized API Responses for frontend consumption

### Architecture 
#### Backend Stack
- Runtime: Node.js

- Framework: Express.js

- Database: MongoDB

- Authentication: JWT (JSON Web Tokens)

- File Storage: Cloudinary

- Image Processing: Multer for file uploads

- Deployment: Render


 ### Project Structure
DRUKHEALTHBACK

│

├── scripts/

│   └── seedSuperAdmin.js

│

├── src/

│   ├── config/

│   │   ├── cloudinary.js

│   │   └── db.js

│   │

│   ├── controllers/

│   │   ├── authController.js

│   │   ├── managementController.js

│   │   ├── scanController.js

│   │   └── userController.js

│   │

│   ├── middleware/

│   │   ├── auth.js

│   │   ├── authMiddleware.js

│   │   └── upload.js

│   │

│   ├── models/

│   │   ├── ctgScan.js

│   │   ├── managementModel.js

│   │   └── User.js

│   │

│   ├── routes/

│   │   ├── authRoutes.js

│   │   ├── managementRoutes.js

│   │   ├── scanRoutes.js

│   │   └── userRoutes.js

│   │

│   └── utils/

│       └── response.js

│

├── app.js

├── server.js

├── package.json

├── package-lock.json

└── .env

### Key File Descriptions:
- server.js: Application entry point

- app.js: Express app configuration

- config/: Database and cloud service configurations

- controllers/: Business logic for each module

- models/: MongoDB schema definitions

- routes/: API route definitions

- middleware/: Authentication and file upload middleware


### Installation Steps
#### Prerequisites
- Node.js (version 14 or higher)

- MongoDB Atlas account or local MongoDB installation

- Cloudinary account for image storage

- Gmail account for email services


#### Setup Instructions
1. Clone the repository
   
  - git clone https://github.com/DrukHealth/Backend.git
  - cd Backend
    
2. Install dependencies

  - npm install

3. Configure Environment Variables
  - Create a .env file with the following variables:

        PORT=5000
        MONGO_URI="mongodb+srv://12220045gcit:Kunzang1234@cluster0.rskaemg.mongodb.net/drukhealth?retryWrites=true&w=majority"
        JWT_SECRET=mySuperSecretKey
        CLOUDINARY_API_KEY=522272821951884
        CLOUDINARY_API_SECRET=gGICVeYwIKD02hW0weemvE1Ju98
        CLOUDINARY_CLOUD_NAME=dgclndz9b
        CLOUDINARY_URL=cloudinary://522272821951884:gGICVeYwIKD02hW0weemvE1Ju98@dgclndz9b
        GMAIL_USER=kcheki46@gmail.com
        GMAIL_CLIENT_ID=998597843974-6tan7f041qdrnma9u882l58joedm0aou.apps.googleusercontent.com
        GMAIL_CLIENT_SECRET=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
        GMAIL_REFRESH_TOKEN=1//0gH4E-F1MF8pgCgYIARAAGBASNwF-L9IrUfvJaQKcTu43uiCwmTX74Z1sHJ43Sd_DAcREv6iCoUJJbZub0M5aPQJF5Bnd_paPufo
        FASTAPI_BASE_URL=http://localhost:8000

4. Run the server
   
  - node server.js
    
For development with auto-restart:

  - npm run dev

### API Documentation
#### Base URL

    https://backend-drukhealth.onrender.com
    

### API Endpoints
#### Authentication Routes (/api/auth/*)

- POST /api/auth/login - User/Admin login

- POST /api/auth/register - User registration

- POST /api/auth/forgot-password - Password reset request

- POST /api/auth/reset-password - Password reset

- POST /api/auth/verify-otp - OTP verification

#### User Routes (/api/user/*)
- GET /api/user/profile - Get user profile

- PUT /api/user/profile - Update user profile

- PUT /api/user/change-password - Change password

#### Scan Routes (/api/scan/*)
- POST /api/scan/upload - Upload CTG image for analysis

- GET /api/scan/history - Get user's scan history

- GET /api/scan/:id - Get specific scan details

- GET /api/scan/admin/all - Get all scans (Admin only)

#### Management Routes (/api/management/*)
- GET /api/management/users - Get all users (Admin only)

- POST /api/management/users - Create new user (Super Admin only)

- PUT /api/management/users/:id - Update user (Super Admin only)

- DELETE /api/management/users/:id - Delete user (Super Admin only)

- GET /api/management/stats - Get system statistics (Admin only)

### Environment Configuration
#### Current Environment Variables

##### Server Configuration
PORT=5000

#### Database
MONGO_URI="mongodb+srv://12220045gcit:Kunzang1234@cluster0.rskaemg.mongodb.net/drukhealth?retryWrites=true&w=majority"

####  Authentication
JWT_SECRET=mySuperSecretKey

#### Cloud Storage (Cloudinary)
CLOUDINARY_API_KEY=522272821951884
CLOUDINARY_API_SECRET=gGICVeYwIKD02hW0weemvE1Ju98
CLOUDINARY_CLOUD_NAME=dgclndz9b
CLOUDINARY_URL=cloudinary://522272821951884:gGICVeYwIKD02hW0weemvE1Ju98@dgclndz9b

#### Email Service (Gmail)
GMAIL_USER=kcheki46@gmail.com
GMAIL_CLIENT_ID=998597843974-6tan7f041qdrnma9u882l58joedm0aou.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=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
GMAIL_REFRESH_TOKEN=1//0gH4E-F1MF8pgCgYIARAAGBASNwF-L9IrUfvJaQKcTu43uiCwmTX74Z1sHJ43Sd_DAcREv6iCoUJJbZub0M5aPQJF5Bnd_paPufo

#### AI Service Integration
FASTAPI_BASE_URL=http://localhost:8000


### Deployment
#### Current Deployment
- Platform: Render

- Live URL: https://backend-drukhealth.onrender.com

- Status: Active

### Deployment Configuration on Render
- Runtime: Node.js

- Build Command: npm install

- Start Command: node server.js

- Environment Variables: All .env variables configured in Render dashboard

### Deployment Instructions
1. Prepare for production
  - npm install
    
2. Start production server
  - node server.js

### Integration Guide
#### Frontend Integration

Update your frontend environment variables:
- VITE_NODE_API_BASE_URL=https://backend-drukhealth.onrender.com/api

### FastAPI Integration

Ensure your FastAPI server is accessible and update:
- FASTAPI_BASE_URL=https://fastapi-backend-yrc0.onrender.com 

### Testing the Live API
#### Health Check

- curl https://backend-drukhealth.onrender.com/

### Monitoring
- Render Dashboard: Monitor server performance and logs

- MongoDB Atlas: Database performance and storage

- Cloudinary: Image storage and bandwidth usage

- Uptime: Continuous health monitoring

