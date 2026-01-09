import os
import logging
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

_firebase_app = None


def ensure_firebase_initialized():
	"""Ensure Firebase Admin app is initialized before any auth call."""
	global _firebase_app
	if _firebase_app is None:
		initialize_firebase()
	return _firebase_app


def initialize_firebase():
	"""Initialize Firebase Admin SDK once at app startup."""
	global _firebase_app
	
	if _firebase_app is not None:
		return _firebase_app
	
	service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
	
	if not service_account_path:
		raise RuntimeError(
			'FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set. '
			'Point to your Firebase service account JSON file.'
		)
	
	if not os.path.exists(service_account_path):
		raise RuntimeError(
			f'Firebase service account file not found at: {service_account_path}'
		)
	
	cred = credentials.Certificate(service_account_path)
	_firebase_app = firebase_admin.initialize_app(cred)
	logger.info('Firebase Admin SDK initialized')
	return _firebase_app


def verify_firebase_token(token: str) -> dict:
	"""Verify Firebase ID token and return decoded claims. Raises HTTPException for REST endpoints."""
	ensure_firebase_initialized()
	try:
		claims = auth.verify_id_token(token)
		return claims
	except auth.InvalidIdTokenError:
		raise HTTPException(status_code=401, detail='Invalid ID token')
	except auth.ExpiredIdTokenError:
		raise HTTPException(status_code=401, detail='ID token has expired')
	except Exception as err:
		raise HTTPException(status_code=401, detail='Token verification failed')


def verify_firebase_token_ws(token: str) -> tuple[bool, dict | None, str]:
	"""Verify Firebase ID token for WebSocket. Returns (success, claims, error_reason)."""
	ensure_firebase_initialized()
	if not token:
		return False, None, 'Token is required'
	
	try:
		claims = auth.verify_id_token(token)
		logger.info(f'WebSocket token verified for uid: {claims.get("uid")}')
		return True, claims, ''
	except auth.InvalidIdTokenError as err:
		logger.warning(f'WebSocket auth failed: invalid token - {err}')
		return False, None, 'Invalid ID token'
	except auth.ExpiredIdTokenError as err:
		logger.warning(f'WebSocket auth failed: expired token - {err}')
		return False, None, 'ID token has expired'
	except auth.RevokedIdTokenError as err:
		logger.warning(f'WebSocket auth failed: revoked token - {err}')
		return False, None, 'ID token has been revoked'
	except Exception as err:
		logger.error(f'WebSocket token verification error: {type(err).__name__}: {err}', exc_info=True)
		return False, None, f'Token verification failed: {type(err).__name__}'


security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
	"""Dependency to extract and verify Firebase token from Authorization header."""
	token = credentials.credentials
	if not token:
		raise HTTPException(status_code=401, detail='Missing authentication token')
	return verify_firebase_token(token)

