import logging
from fastapi import APIRouter, Depends
from fastapi import status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.zoom_sdk_service import zoom_sdk_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/zoom/sdk', tags=['zoom-sdk'])


class ZoomSDKSignatureRequest(BaseModel):
	meetingNumber: str = Field(..., min_length=1)
	role: int = Field(..., ge=0, le=1)


class ZoomSDKSignatureResponse(BaseModel):
	signature: str


@router.post('/signature', response_model=ZoomSDKSignatureResponse, status_code=status.HTTP_200_OK)
async def create_zoom_sdk_signature(request: ZoomSDKSignatureRequest, current_user: dict = Depends(get_current_user)):
	uid = current_user.get('uid') or 'unknown'
	logger.info('SDK signature requested by uid=%s meeting=%s role=%s', uid, request.meetingNumber, request.role)
	signature = zoom_sdk_service.generate_signature(meeting_number=request.meetingNumber, role=request.role)
	return ZoomSDKSignatureResponse(signature=signature)