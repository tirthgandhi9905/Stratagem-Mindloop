import { auth } from '../config/firebase'

const DEFAULT_WS_BASE = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL?.replace('http', 'ws')

// Connection states
const STATE = {
	DISCONNECTED: 'DISCONNECTED',
	CONNECTING: 'CONNECTING',
	CONNECTED: 'CONNECTED',
}

let socket = null
let connectionState = STATE.DISCONNECTED
let currentMeetingId = null
let connectPromiseResolve = null
let connectPromiseReject = null

const ensureWebSocketBase = () => {
	if (!DEFAULT_WS_BASE) {
		throw new Error('WebSocket base URL not configured. Set VITE_WS_BASE_URL or VITE_API_BASE_URL.')
	}
	return DEFAULT_WS_BASE.replace(/\/$/, '')
}

const getFreshToken = async () => {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User is not authenticated')
	}
	return user.getIdToken()
}

const getConnectionState = () => connectionState

const setConnectionState = (newState) => {
	connectionState = newState
}

export const connectMeeting = async (meetingId) => {
	if (!meetingId) {
		throw new Error('meetingId is required to open a WebSocket connection')
	}

	if (connectionState === STATE.CONNECTING) {
		throw new Error('WebSocket connection is already in progress')
	}

	if (connectionState === STATE.CONNECTED) {
		if (currentMeetingId === meetingId) {
			return
		}
		disconnectMeeting()
	}

	setConnectionState(STATE.CONNECTING)

	try {
		const token = await getFreshToken()
		const wsBase = ensureWebSocketBase()
		const endpoint = `${wsBase}/ws/meeting?meeting_id=${encodeURIComponent(meetingId)}&token=${encodeURIComponent(token)}`

		socket = new WebSocket(endpoint)
		currentMeetingId = meetingId

		return new Promise((resolve, reject) => {
			connectPromiseResolve = resolve
			connectPromiseReject = reject

			const timeout = setTimeout(() => {
				reject(new Error('WebSocket connection timeout'))
				cleanupSocket()
			}, 5000)

			socket.onopen = () => {
				clearTimeout(timeout)
				setConnectionState(STATE.CONNECTED)
				if (connectPromiseResolve) {
					connectPromiseResolve()
					connectPromiseResolve = null
				}
			}

			socket.onerror = () => {
				clearTimeout(timeout)
				const errorMsg = 'WebSocket connection failed. Check token validity and backend availability.'
				if (connectPromiseReject) {
					connectPromiseReject(new Error(errorMsg))
					connectPromiseReject = null
				}
				cleanupSocket()
			}

			socket.onclose = (event) => {
				clearTimeout(timeout)
				if (connectionState === STATE.CONNECTING && connectPromiseReject) {
					const errorMsg = event.reason || `WebSocket closed with code ${event.code}`
					connectPromiseReject(new Error(errorMsg))
					connectPromiseReject = null
				}
				cleanupSocket()
			}
		})
	} catch (err) {
		setConnectionState(STATE.DISCONNECTED)
		throw err
	}
}

export const isConnected = () => getConnectionState() === STATE.CONNECTED && socket?.readyState === WebSocket.OPEN

export const getActiveMeetingId = () => currentMeetingId

export const sendMeetingData = (payload) => {
	if (getConnectionState() !== STATE.CONNECTED) {
		const state = getConnectionState()
		throw new Error(`WebSocket is ${state}. Connect to a meeting first.`)
	}

	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error('WebSocket is not in OPEN state')
	}

	const message = {
		audio_chunk: payload?.audio_chunk ?? null,
		caption_text: payload?.caption_text ?? '',
		speaker_name: payload?.speaker_name ?? 'Unknown speaker',
		timestamp: payload?.timestamp ?? Date.now(),
	}

	try {
		socket.send(JSON.stringify(message))
	} catch (err) {
		throw new Error('Failed to send message: ' + err.message)
	}
}

export const disconnectMeeting = () => {
	if (getConnectionState() === STATE.DISCONNECTED && !socket) {
		return
	}

	cleanupSocket()
}

const cleanupSocket = () => {
	if (socket) {
		try {
			socket.close(1000, 'Client initiated disconnect')
		} catch (err) {
			// Ignore socket close failures during cleanup
		}
		socket = null
	}
	currentMeetingId = null
	connectPromiseResolve = null
	connectPromiseReject = null
	setConnectionState(STATE.DISCONNECTED)
}

