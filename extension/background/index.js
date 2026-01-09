const SESSION_STORAGE_KEY = 'sessionToken'
const MEETING_STORAGE_KEY = 'activeMeeting'
const SESSION_TRIGGER_KEY = 'sessionTriggeredMap'
const DEFAULT_API_BASE = 'http://localhost:9000'
const API_BASE_URL = (globalThis?.EXTENSION_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '')
const ENDPOINTS = {
	verifySession: '/extension/session/verify',
	meetingStart: '/meeting/start',
	meetingEnd: '/meeting/end',
	meetingSessionStart: '/meeting/session/start',
}

let activeSession = {
	sessionToken: null,
	sessionProfile: null,
}

let activeMeeting = null

const log = (message, ...rest) => console.log(`[Extension] ${message}`, ...rest)
const warn = (message, ...rest) => console.warn(`[Extension] ${message}`, ...rest)

const readStorageKey = (key) =>
	new Promise((resolve, reject) => {
		chrome.storage.local.get([key], (result) => {
			const runtimeError = chrome.runtime.lastError
			if (runtimeError) {
				reject(new Error(runtimeError.message))
				return
			}

			resolve(result[key] ?? null)
		})
	})

const writeStorageKey = (key, value) =>
	new Promise((resolve, reject) => {
		chrome.storage.local.set({ [key]: value ?? null }, () => {
			const runtimeError = chrome.runtime.lastError
			if (runtimeError) {
				reject(new Error(runtimeError.message))
				return
			}

			resolve()
		})
	})

const getStoredSessionToken = () => readStorageKey(SESSION_STORAGE_KEY)
const setStoredSessionToken = (value) => writeStorageKey(SESSION_STORAGE_KEY, value)
const getStoredMeeting = () => readStorageKey(MEETING_STORAGE_KEY)
const setStoredMeeting = (value) => writeStorageKey(MEETING_STORAGE_KEY, value)
const getSessionTriggerMap = async () => (await readStorageKey(SESSION_TRIGGER_KEY)) || {}
const setSessionTriggerMap = (value) => writeStorageKey(SESSION_TRIGGER_KEY, value)

const callBackend = async (path, { method = 'POST', body = null, sessionToken = null, requiresSession = true } = {}) => {
	const headers = {
		'Content-Type': 'application/json',
	}

	if (requiresSession) {
		if (!sessionToken) {
			throw new Error('Connect the extension before continuing')
		}
		headers['X-Extension-Session'] = sessionToken
	}

	let response
	try {
		response = await fetch(`${API_BASE_URL}${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		})
	} catch (error) {
		throw new Error('Unable to reach backend. Check your connection.')
	}

	let data = null
	try {
		data = await response.json()
	} catch (error) {
		data = null
	}

	if (!response.ok) {
		const message = data?.detail || data?.message || 'Request failed'
		throw new Error(message)
	}

	return data
}

const verifySessionWithBackend = async (sessionId) => {
	const sanitized = typeof sessionId === 'string' ? sessionId.trim() : ''
	if (!sanitized) {
		throw new Error('Session ID is required')
	}

	return callBackend(ENDPOINTS.verifySession, {
		method: 'POST',
		body: { sessionId: sanitized },
		requiresSession: false,
	})
}

const triggerMeetingSessionIfNeeded = async (sessionToken) => {
	const token = typeof sessionToken === 'string' ? sessionToken.trim() : ''
	if (!token) return

	try {
		log('Triggering meeting session for token:', token.slice(0, 10) + '...')
		const result = await callBackend(ENDPOINTS.meetingSessionStart, {
			method: 'POST',
			body: {
				sessionToken: token,
				meetingSource: 'google_meet',
				timestamp: Date.now(),
			},
			requiresSession: false,
		})
		log('Meeting session trigger response:', result)
	} catch (error) {
		warn('Failed to trigger meeting session', error.message)
	}
}

const startMeetingWithBackend = (sessionToken, meetUrl) =>
	callBackend(ENDPOINTS.meetingStart, {
		method: 'POST',
		body: { meetUrl },
		sessionToken,
	})

const endMeetingWithBackend = (sessionToken, meetingId) =>
	callBackend(ENDPOINTS.meetingEnd, {
		method: 'POST',
		body: { meetingId },
		sessionToken,
	})

const persistSession = async (sessionToken, sessionProfile) => {
	await setStoredSessionToken(sessionToken)
	activeSession = {
		sessionToken,
		sessionProfile,
	}
}

const clearSessionStorage = async () => {
	await setStoredSessionToken(null)
	activeSession = { sessionToken: null, sessionProfile: null }
}

const serializeMeetingForStorage = (meeting) => {
	if (!meeting) {
		return null
	}
	const { meetingId, role, meetUrl, startedAt } = meeting
	return { meetingId, role, meetUrl, startedAt }
}

const setActiveMeeting = async (meeting) => {
	activeMeeting = meeting
	await setStoredMeeting(serializeMeetingForStorage(meeting))
}

const endActiveMeeting = async (reason = 'UNKNOWN') => {
	if (!activeMeeting) {
		return
	}

	const { meetingId } = activeMeeting
	if (!meetingId) {
		await setActiveMeeting(null)
		return
	}

	if (!activeSession.sessionToken) {
		warn('Cannot notify backend about meeting end: missing session token')
		await setActiveMeeting(null)
		return
	}

	try {
		await endMeetingWithBackend(activeSession.sessionToken, meetingId)
		log(`Meeting ${meetingId} ended (${reason})`)
	} catch (error) {
		warn(`Failed to end meeting (${reason})`, error.message)
	} finally {
		await setActiveMeeting(null)
	}
}

const rehydrateSession = async () => {
	const storedToken = await getStoredSessionToken().catch((error) => {
		warn('Unable to read stored session', error.message)
		return null
	})
	if (!storedToken) {
		return
	}
	try {
		const profile = await verifySessionWithBackend(storedToken)
		activeSession = { sessionToken: storedToken, sessionProfile: profile }
		log('Stored session verified at startup')
		await triggerMeetingSessionIfNeeded(storedToken)
	} catch (error) {
		await clearSessionStorage()
		warn('Stored session rejected by backend; clearing local cache')
	}
}

const rehydrateMeeting = async () => {
	if (!activeSession.sessionToken) {
		await setStoredMeeting(null)
		return
	}

	const storedMeeting = await getStoredMeeting().catch((error) => {
		warn('Unable to read stored meeting state', error.message)
		return null
	})
	if (storedMeeting) {
		activeMeeting = { ...storedMeeting, tabId: null }
		log('Rehydrated active meeting from storage')
	}
}

const startMeetingLifecycle = async (tabId, meetUrl) => {
	if (!tabId || typeof tabId !== 'number') {
		throw new Error('Missing tab information for meeting start')
	}

	const sanitizedUrl = typeof meetUrl === 'string' ? meetUrl.trim() : ''
	if (!sanitizedUrl) {
		throw new Error('Meet URL is required')
	}

	if (activeMeeting) {
		if (!activeMeeting.tabId && typeof tabId === 'number') {
			const reboundMeeting = { ...activeMeeting, tabId }
			await setActiveMeeting(reboundMeeting)
			return reboundMeeting
		}
		if (activeMeeting.tabId === tabId) {
			return activeMeeting
		}
		throw new Error('A meeting is already active. End it before starting another one.')
	}

	if (!activeSession.sessionToken) {
		throw new Error('Connect the extension before joining a meeting')
	}

	const response = await startMeetingWithBackend(activeSession.sessionToken, sanitizedUrl)
	const meetingRecord = {
		meetingId: response?.meetingId,
		role: response?.role,
		meetUrl: sanitizedUrl,
		startedAt: Date.now(),
		tabId,
	}
	await setActiveMeeting(meetingRecord)
	log(`Meeting ${meetingRecord.meetingId} started`)
	return meetingRecord
}

const endMeetingForTab = async (tabId, reason = 'TAB_EVENT') => {
	if (!activeMeeting) {
		return
	}
	if (typeof tabId === 'number') {
		if (!activeMeeting.tabId || activeMeeting.tabId !== tabId) {
			return
		}
	}
	await endActiveMeeting(reason)
}

chrome.runtime.onInstalled.addListener(() => {
	log('Background service worker installed')
})

chrome.tabs.onRemoved.addListener((tabId) => {
	endMeetingForTab(tabId, 'TAB_REMOVED').catch((error) => warn('Failed to clean up meeting on tab removal', error.message))
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (changeInfo.status === 'loading') {
		endMeetingForTab(tabId, 'TAB_NAVIGATED').catch((error) => warn('Failed to clean up meeting on navigation', error.message))
	}
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message || typeof message !== 'object') {
		return false
	}

	switch (message.type) {
		case 'GET_SESSION':
			sendResponse({
				sessionToken: activeSession.sessionToken,
				sessionProfile: activeSession.sessionProfile,
				activeMeeting: serializeMeetingForStorage(activeMeeting),
			})
			return false
		case 'VERIFY_SESSION': {
			const nextSessionId = typeof message.sessionId === 'string' ? message.sessionId.trim() : ''
			;(async () => {
				try {
					const profile = await verifySessionWithBackend(nextSessionId)
					await persistSession(nextSessionId, profile)
					await triggerMeetingSessionIfNeeded(nextSessionId)
					log('Session verified and stored')
					sendResponse({
						sessionToken: nextSessionId,
						sessionProfile: profile,
						activeMeeting: serializeMeetingForStorage(activeMeeting),
					})
				} catch (error) {
					sendResponse({ error: error.message })
				}
			})()
			return true
		}
		case 'CLEAR_SESSION':
			;(async () => {
				try {
					await endActiveMeeting('SESSION_CLEARED')
					await clearSessionStorage()
					log('Session cleared by user action')
					sendResponse({ success: true })
				} catch (error) {
					sendResponse({ error: error.message })
				}
			})()
			return true
		case 'MEETING_STARTED': {
			const tabId = sender?.tab?.id
			const meetUrl = message?.details?.meetUrl
			;(async () => {
				try {
					const meeting = await startMeetingLifecycle(tabId, meetUrl)
					await triggerMeetingSessionIfNeeded(activeSession.sessionToken)
					sendResponse({ meetingId: meeting.meetingId, role: meeting.role })
				} catch (error) {
					sendResponse({ error: error.message })
				}
			})()
			return true
		}
		case 'MEETING_ENDED': {
			const tabId = sender?.tab?.id
			;(async () => {
				await endMeetingForTab(tabId, 'CONTENT_SIGNAL')
				sendResponse({ acknowledged: true })
			})()
			return true
		}
		default:
			return false
	}
})

;(async () => {
	await rehydrateSession()
	await rehydrateMeeting()
})().catch((error) => warn('Failed to restore extension state', error.message))
