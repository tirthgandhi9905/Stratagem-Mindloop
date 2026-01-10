import { authedRequest } from './orgApi'

export const fetchMeetings = async () => {
	return authedRequest('/meetings', { method: 'GET' })
}

export const createMeeting = async ({ teamId, topic, startTime, durationMinutes }) => {
	return authedRequest('/zoom/meeting/create', {
		method: 'POST',
		body: JSON.stringify({ teamId, topic, startTime, durationMinutes }),
	})
}