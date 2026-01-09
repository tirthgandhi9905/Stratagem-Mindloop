# Google Meet Intelligence Platform - Backend API

FastAPI backend with Firebase Authentication integration.

## Setup

### Prerequisites
- Python 3.8+
- Firebase project with Admin SDK credentials

### Installation

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment:**

   Copy `.env.example` to `.env` and update:
   ```bash
   cp .env.example .env
   ```

   In `.env`, set:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
   ```

3. **Add Firebase Service Account:**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `service-account.json` in the backend directory

## Running the Server

```bash
python -m app.main
```

The API will start at `http://127.0.0.1:9000`

- Swagger UI: `http://127.0.0.1:9000/docs`
- ReDoc: `http://127.0.0.1:9000/redoc`

## API Endpoints

### Health Check
```
GET /health
```
Returns: `{ "status": "healthy" }`

### Authentication

#### Login (verify Firebase token)
```
POST /auth/login
Content-Type: application/json

{
  "idToken": "firebase_id_token_from_frontend"
}
```

Response (200):
```json
{
  "uid": "user_uid",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://..."
}
```

#### Get Current User (protected)
```
GET /auth/me
Authorization: Bearer <firebase_id_token>
```

Response (200):
```json
{
  "uid": "user_uid",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://..."
}
```

### Error Responses

**Invalid/Expired Token (401):**
```json
{
  "detail": "Invalid ID token"
}
```

**Missing Authorization Header (401):**
```json
{
  "detail": "Missing authentication token"
}
```

## Architecture

- **app/core/security.py**: Firebase Admin SDK initialization & token verification
- **app/api/auth.py**: Authentication routes
- **app/main.py**: FastAPI application setup & CORS configuration

## Firebase Token Flow

1. Frontend user signs in with Firebase Authentication (Google provider)
2. Frontend gets Firebase ID token via `user.getIdToken()`
3. Frontend sends token to `/auth/login` or in `Authorization: Bearer` header
4. Backend verifies token using Firebase Admin SDK
5. Backend returns user info (no database storage, no custom JWT)

## CORS

Configured for development on:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

Update `app/main.py` for production URLs.

## Security Notes

- Tokens verified server-side using Firebase Admin SDK
- No custom JWTs issued
- No user data stored in database
- All requests require valid Firebase token
- CORS enabled for whitelisted origins only
