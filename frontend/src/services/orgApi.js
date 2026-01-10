import { auth } from '../config/firebase'

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '')

export const authedRequest = async (path, options = {}) => {
	const user = auth.currentUser
	if (!user) {
		throw new Error('You must be signed in to continue.')
	}
	const token = await user.getIdToken()

	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
		...(options.headers || {}),
	}

	const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
		...options,
		headers,
	})

	let data = null
	try {
		data = await response.json()
	} catch (err) {
		data = null
	}

	if (!response.ok) {
		const message = formatErrorMessage(data)
		throw new Error(message)
	}

	return data ?? {}
}

const formatErrorMessage = (data) => {
	if (!data) return 'Request failed'
	const { detail, message } = data
	if (typeof detail === 'string') return detail
	if (Array.isArray(detail)) {
		return detail
			.map((item) => {
				if (typeof item === 'string') return item
				if (item?.msg) return item.msg
				return JSON.stringify(item)
			})
			.join('; ')
	}
	return message || 'Request failed'
}

export const createOrganization = async ({ name, description }) => {
	return authedRequest('/org/create', {
		method: 'POST',
		body: JSON.stringify({ name, description }),
	})
}

export const joinOrganization = async ({ joinCode }) => {
	return authedRequest('/org/join', {
		method: 'POST',
		body: JSON.stringify({ joinCode }),
	})
}