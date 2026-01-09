const statusText = document.getElementById('statusText')
const sessionInput = document.getElementById('sessionInput')
const connectButton = document.getElementById('connectButton')
const disconnectButton = document.getElementById('disconnectButton')
const feedbackText = document.getElementById('feedbackText')
const meetingStatusText = document.getElementById('meetingStatusText')
const meetingRoleText = document.getElementById('meetingRoleText')

let isBusy = false

const sendMessage = (payload) =>
	new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(payload, (response) => {
			const runtimeError = chrome.runtime.lastError
			if (runtimeError) {
				reject(new Error(runtimeError.message))
				return
			}

			resolve(response)
		})
	})

const setFeedback = (message = '', tone = 'neutral') => {
	feedbackText.textContent = message
	feedbackText.classList.remove('error', 'success')
	if (tone === 'error') {
		feedbackText.classList.add('error')
	}
	if (tone === 'success') {
		feedbackText.classList.add('success')
	}
}

const renderConnectionStatus = ({ sessionToken, sessionProfile }) => {
	const connected = Boolean(sessionToken && sessionProfile)
	statusText.textContent = connected
		? `Connected${sessionProfile?.email ? ` · ${sessionProfile.email}` : ''}`
		: 'Not connected'
	disconnectButton.hidden = !connected
	disconnectButton.disabled = !connected || isBusy
}

const renderMeetingStatus = (meeting) => {
	if (meeting?.meetingId) {
		meetingStatusText.textContent = 'Meeting active'
		meetingRoleText.textContent = `Role: ${meeting.role || 'EMPLOYEE'}`
	} else {
		meetingStatusText.textContent = 'No meeting active'
		meetingRoleText.textContent = 'Role: —'
	}
}

const renderState = (payload = {}) => {
	renderConnectionStatus({
		sessionToken: payload.sessionToken,
		sessionProfile: payload.sessionProfile,
	})
	renderMeetingStatus(payload.activeMeeting)
}

const syncConnectButton = () => {
	const hasInput = Boolean(sessionInput.value.trim())
	connectButton.disabled = !hasInput || isBusy
}

const setBusy = (nextBusy) => {
	isBusy = nextBusy
	syncConnectButton()
	disconnectButton.disabled = disconnectButton.hidden || nextBusy
}

const refreshSession = async () => {
	try {
		const response = await sendMessage({ type: 'GET_SESSION' })
		renderState(response ?? { sessionToken: null, sessionProfile: null, activeMeeting: null })
		if (!response?.sessionToken) {
			setFeedback('Generate a session from the dashboard to connect.')
		}
	} catch (error) {
		console.error('[Extension] Failed to read session token', error)
		renderState({ sessionToken: null, sessionProfile: null, activeMeeting: null })
		setFeedback('Unable to read session state', 'error')
	}
}

connectButton.addEventListener('click', async () => {
	const sessionId = sessionInput.value.trim()
	if (!sessionId) {
		setFeedback('Session ID is required', 'error')
		return
	}

	setBusy(true)
	setFeedback('Connecting…')
	try {
		const response = await sendMessage({ type: 'VERIFY_SESSION', sessionId })
		if (response?.error) {
			throw new Error(response.error)
		}
		sessionInput.value = ''
		renderState(response ?? { sessionToken: null, sessionProfile: null, activeMeeting: null })
		setFeedback('Session verified. You are connected.', 'success')
	} catch (error) {
		setFeedback(error.message || 'Failed to connect session', 'error')
	} finally {
		setBusy(false)
	}
})

disconnectButton.addEventListener('click', async () => {
	setBusy(true)
	setFeedback('Disconnecting…')
	try {
		const response = await sendMessage({ type: 'CLEAR_SESSION' })
		if (response?.error) {
			throw new Error(response.error)
		}
		renderState({ sessionToken: null, sessionProfile: null, activeMeeting: null })
		setFeedback('Session removed. Paste a new token to reconnect.', 'success')
	} catch (error) {
		setFeedback(error.message || 'Unable to clear session', 'error')
	} finally {
		setBusy(false)
	}
})

sessionInput.addEventListener('input', syncConnectButton)

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'local') {
		return
	}
	if (Object.prototype.hasOwnProperty.call(changes, 'sessionToken')) {
		refreshSession()
	}
	if (Object.prototype.hasOwnProperty.call(changes, 'activeMeeting')) {
		renderMeetingStatus(changes.activeMeeting.newValue ?? null)
	}
})

syncConnectButton()
renderMeetingStatus(null)
refreshSession()
