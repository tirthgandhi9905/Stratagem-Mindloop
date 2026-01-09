from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Path, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.task_service import TaskFilters, task_service

router = APIRouter(prefix='/tasks', tags=['tasks'])

PriorityLiteral = Literal['low', 'medium', 'high']


class TaskCreateRequest(BaseModel):
	title: str = Field(..., min_length=3, max_length=160)
	description: str = Field(..., min_length=5, max_length=4000)
	assignedToEmail: str = Field(..., min_length=5, max_length=320)
	priority: PriorityLiteral = Field(default='medium')
	dueDate: datetime | None = None
	createGithubIssue: bool = False
	targetGithubRepoId: str | None = Field(None, description='Optional: Target GitHub repository ID')


class TaskResponse(BaseModel):
	taskId: str
	title: str
	description: str
	assignedToEmail: str | None = None
	assignedUid: str | None = None
	priority: str
	status: str
	source: str
	createdAt: str | None = None
	dueDate: str | None = None
	completedAt: str | None = None
	completedByEmail: str | None = None
	githubIssueUrl: str | None = None
	githubIssueNumber: int | None = None
	githubRepoId: str | None = None
	createdByEmail: str | None = None


@router.post('/create', response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(request: TaskCreateRequest, current_user: dict = Depends(get_current_user)):
	payload = {
		'title': request.title.strip(),
		'description': request.description.strip(),
		'assignedToEmail': request.assignedToEmail.strip().lower(),
		'priority': request.priority,
		'dueDate': request.dueDate.isoformat() if isinstance(request.dueDate, datetime) else request.dueDate,
		'createGithubIssue': request.createGithubIssue,
		'targetGithubRepoId': request.targetGithubRepoId,
	}

	result = await task_service.create_task_manual(
		creator_uid=current_user.get('uid'),
		creator_email=current_user.get('email'),
		payload=payload,
	)
	return TaskResponse(**result)


@router.get('', response_model=list[TaskResponse])
async def list_tasks(
	current_user: dict = Depends(get_current_user),
	assignedToEmail: str | None = Query(default=None),
	priority: PriorityLiteral | None = Query(default=None),
	source: str | None = Query(default=None),
	hasGithubIssue: bool | None = Query(default=None),
	mine: bool = Query(default=False),
	status: str | None = Query(default=None),
):
	filters = TaskFilters(
		assigned_to_email=assignedToEmail.lower() if assignedToEmail else None,
		priority=priority,
		source=source,
		has_github_issue=hasGithubIssue,
		status=status.upper() if status else None,
		mine=mine,
	)

	tasks = await task_service.list_tasks(current_user=current_user, filters=filters)
	return [TaskResponse(**task) for task in tasks]


@router.post('/{task_id}/complete', response_model=TaskResponse)
async def complete_task(
	task_id: str = Path(..., min_length=4, description='Task identifier'),
	current_user: dict = Depends(get_current_user),
):
	task = await task_service.complete_task(current_user=current_user, task_id=task_id)
	return TaskResponse(**task)
