import { authedRequest } from './orgApi'

const buildQueryString = (params = {}) => {
	const query = new URLSearchParams()
	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null || value === '') {
			return
		}
		query.append(key, value)
	})
	const serialized = query.toString()
	return serialized ? `?${serialized}` : ''
}

export const fetchTasks = async (params = {}) => {
	const query = buildQueryString(params)
	return authedRequest(`/tasks${query}`)
}

export const createTask = async (payload) => {
	return authedRequest('/tasks/create', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

export const completeTask = async (taskId) => {
	if (!taskId) {
		throw new Error('taskId is required')
	}
	return authedRequest(`/tasks/${taskId}/complete`, {
		method: 'POST',
	})
}
