import { auth } from '../config/firebase'

const DEFAULT_WS_BASE = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL?.replace('http', 'ws')

const STATE = {
	DISCONNECTED: 'DISCONNECTED',
	CONNECTING: 'CONNECTING',
	CONNECTED: 'CONNECTED',
}

let socket = null
let connectionState = STATE.DISCONNECTED
let listeners = {}
let connectPromise = null
let reconnectTimer = null
let keepAliveTimer = null

const ensureWsBase = () => {
	if (!DEFAULT_WS_BASE) {
		throw new Error('WebSocket base URL not configured. Set VITE_WS_BASE_URL or VITE_API_BASE_URL.')
	}
	return DEFAULT_WS_BASE.replace(/\/$/, '')
}

const getFreshToken = async () => {
	const user = auth.currentUser
	if (!user) throw new Error('User is not authenticated')
	return user.getIdToken()
}

const setState = (state) => {
	console.log('[NotificationSocket] State changed to:', state)
	connectionState = state
}

const scheduleReconnect = () => {
	if (reconnectTimer) return
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = null
		connectNotifications().catch(() => {})
	}, 3000)
}

const startKeepAlive = () => {
	stopKeepAlive()
	keepAliveTimer = window.setInterval(() => {
		try {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send('ping')
			}
		} catch (err) {
			// ignore
		}
	}, 20000)
}

const stopKeepAlive = () => {
	if (keepAliveTimer) {
		clearInterval(keepAliveTimer)
		keepAliveTimer = null
	}
}

export const connectNotifications = async () => {
	if (connectionState === STATE.CONNECTED && socket?.readyState === WebSocket.OPEN) {
		return
	}
	if (connectionState === STATE.CONNECTING && connectPromise) {
		return connectPromise
	}

	setState(STATE.CONNECTING)

	connectPromise = (async () => {
		const token = await getFreshToken()
		const wsBase = ensureWsBase()
		const endpoint = `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`

		return new Promise((resolve, reject) => {
			console.log('[NotificationSocket] Attempting to connect to:', endpoint)
			socket = new WebSocket(endpoint)

			socket.onopen = () => {
				console.log('[NotificationSocket] Connection opened')
				setState(STATE.CONNECTED)
				startKeepAlive()
				resolve()
			}

			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data)
					const { event: eventName, payload } = data || {}
					console.log('[NotificationSocket] Message received:', eventName, payload)
					if (eventName && listeners[eventName]) {
						listeners[eventName].forEach((handler) => {
							try {
								handler(payload)
							} catch (err) {
								console.warn('[NotificationSocket] handler failed', err)
							}
						})
					}
				} catch (err) {
					console.warn('[NotificationSocket] malformed message', err)
				}
			}

			socket.onclose = (event) => {
				console.warn('[NotificationSocket] Connection closed:', event.code, event.reason)
				setState(STATE.DISCONNECTED)
				stopKeepAlive()
				scheduleReconnect()
			}

			socket.onerror = (err) => {
				console.error('[NotificationSocket] Connection error:', err)
				setState(STATE.DISCONNECTED)
				stopKeepAlive()
				scheduleReconnect()
				reject(err)
			}
		})
	})()

	return connectPromise
}

export const disconnectNotifications = () => {
	if (socket) {
		try {
			socket.close(1000, 'Client disconnect')
		} catch (err) {
			// ignore
		}
	}
	socket = null
	connectPromise = null
	stopKeepAlive()
	setState(STATE.DISCONNECTED)
}

export const subscribe = (eventName, handler) => {
	if (!listeners[eventName]) {
		listeners[eventName] = []
	}
	listeners[eventName].push(handler)
	return () => {
		listeners[eventName] = (listeners[eventName] || []).filter((fn) => fn !== handler)
	}
}
