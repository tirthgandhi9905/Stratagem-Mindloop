import { authedRequest } from './orgApi'

export const fetchUserContext = async () => {
	return authedRequest('/me/context', { method: 'GET' })
}
