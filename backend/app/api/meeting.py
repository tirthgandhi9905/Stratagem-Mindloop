from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_extension_session_context
from app.services.meeting_service import meeting_service
from app.services.task_detection_service import task_detection_service

router = APIRouter(prefix='/meeting', tags=['meeting'])


class MeetingStartRequest(BaseModel):
	meetUrl: str = Field(..., min_length=1)


class MeetingStartResponse(BaseModel):
	meetingId: str
	role: str


class MeetingEndRequest(BaseModel):
	meetingId: str = Field(..., min_length=1)


class MeetingEndResponse(BaseModel):
	meetingId: str
	status: str


class MeetingSessionStartRequest(BaseModel):
	sessionToken: str = Field(..., min_length=1)
	meetingSource: str = Field(..., min_length=1)
	timestamp: int | None = None


class MeetingSessionStartResponse(BaseModel):
	status: str
	triggerId: str


@router.post('/start', response_model=MeetingStartResponse)
async def start_meeting(payload: MeetingStartRequest, session=Depends(get_extension_session_context)):
	return await meeting_service.start_meeting(session=session, meet_url=payload.meetUrl)


@router.post('/end', response_model=MeetingEndResponse)
async def end_meeting(payload: MeetingEndRequest, session=Depends(get_extension_session_context)):
	return await meeting_service.end_meeting(session=session, meeting_id=payload.meetingId)


@router.post('/session/start', response_model=MeetingSessionStartResponse)
async def start_meeting_session(payload: MeetingSessionStartRequest):
	result = await task_detection_service.start_session(payload.sessionToken, payload.meetingSource)
	return result
