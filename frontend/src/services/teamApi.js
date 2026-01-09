import { authedRequest } from './orgApi'

export const createTeam = async ({ name, description }) =>
	authedRequest('/teams', {
		method: 'POST',
		body: JSON.stringify({ name, description }),
	})

export const renameTeam = async (teamId, { name, description }) =>
	authedRequest(`/teams/${teamId}`, {
		method: 'PATCH',
		body: JSON.stringify({ name, description }),
	})

export const deleteTeam = async (teamId) =>
	authedRequest(`/teams/${teamId}`, {
		method: 'DELETE',
	})

export const addMemberToTeam = async (teamId, { userId, role }) =>
	authedRequest(`/teams/${teamId}/members`, {
		method: 'POST',
		body: JSON.stringify({ userId, role }),
	})

export const updateTeamMemberRole = async (teamId, userId, role) =>
	authedRequest(`/teams/${teamId}/members/${userId}`, {
		method: 'PATCH',
		body: JSON.stringify({ userId, role }),
	})

export const removeTeamMember = async (teamId, userId) =>
	authedRequest(`/teams/${teamId}/members/${userId}`, {
		method: 'DELETE',
	})
