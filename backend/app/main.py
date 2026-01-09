import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file BEFORE importing modules that need them
load_dotenv()

from app.core.config import get_settings
from app.core.security import initialize_firebase
from app.api import (
	auth,
	websocket as websocket_routes,
	org,
	me,
	teams,
	extension as extension_routes,
	meeting as meeting_routes,
	slack as slack_routes,
	tasks as tasks_routes,
)

# Configure logging
logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.task_detection_service import task_detection_service
import json

router = APIRouter()

@router.websocket("/ws/meet")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # 1. Receive data from Extension
            data = await websocket.receive_text()
            payload = json.loads(data)

            if payload.get("type") == "potential_task":
                # 2. Real-time AI processing
                transcript_text = payload.get("text")
                print(f"Analyzing potential task: {transcript_text}")
                
                # Verify with Gemini if it's TRULY a task
                ai_result = await task_detection_service.verify_and_extract_task(transcript_text)
                
                if ai_result:
                    # 3. Send back to Client (to show Popup)
                    await websocket.send_json({
                        "type": "task_detected",
                        "data": ai_result # Contains {description, assignee, priority}
                    })
                    
    except WebSocketDisconnect:
        print("Client disconnected")

@asynccontextmanager
async def lifespan(app: FastAPI):
	"""FastAPI lifespan event handler for startup/shutdown."""
	# Startup
	initialize_firebase()
	logger.info('✓ Firebase Admin SDK initialized')
	print('✓ Firebase Admin SDK initialized')
	yield
	# Shutdown (cleanup if needed)
	logger.info('✓ Application shutting down')
	print('✓ Shutting down')


app = FastAPI(
	title='Google Meet Intelligence Platform',
	description='AI-powered meeting insights and task management API',
	version='1.0.0',
	lifespan=lifespan,
)

# Enable CORS for frontend
settings = get_settings()
app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_allow_origins,
	allow_origin_regex=settings.cors_allow_origin_regex,
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)

# Include routers
app.include_router(auth.router)
app.include_router(org.router)
app.include_router(teams.router)
app.include_router(me.router)
app.include_router(websocket_routes.router)
app.include_router(extension_routes.router)
app.include_router(meeting_routes.router)
app.include_router(tasks_routes.router)
app.include_router(slack_routes.router)


@app.get('/health')
async def health_check():
	"""Health check endpoint."""
	return {'status': 'healthy'}


@app.get('/')
async def root():
	"""Root endpoint."""
	return {
		'message': 'Google Meet Intelligence Platform API',
		'docs': '/docs',
		'health': '/health',
	}


if __name__ == '__main__':
	import uvicorn
	uvicorn.run(
		'app.main:app',
		host=os.getenv('API_HOST', '0.0.0.0'),
		port=int(os.getenv('API_PORT', '9000')),
		reload=True,
	)
