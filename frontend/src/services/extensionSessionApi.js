import { authedRequest } from './orgApi'

export const createExtensionSession = async ({ orgId }) => {
	if (!orgId) {
		throw new Error('Organization is required to create a session')
	}

	return authedRequest('/extension/session/create', {
		method: 'POST',
		body: JSON.stringify({ orgId }),
	})
}
