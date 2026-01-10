/* global gapi, google */

// Google Calendar API scopes
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'

let tokenClient = null
let accessToken = localStorage.getItem('google_calendar_token')

// Initialize the Google API client
export const initGoogleCalendar = async (apiKey, clientId) => {
	return new Promise((resolve, reject) => {
		gapi.load('client', async () => {
			try {
				await gapi.client.init({
					apiKey: apiKey,
					discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
				})

				// Initialize the token client using Google Identity Services (GSI)
				tokenClient = google.accounts.oauth2.initTokenClient({
					client_id: clientId,
					scope: SCOPES,
					callback: (response) => {
						if (response.error !== undefined) {
							console.error('GIS Error:', response)
							return
						}
						// Store token
						accessToken = response.access_token
						localStorage.setItem('google_calendar_token', accessToken)
					},
				})

				// Set token if we have one saved
				if (accessToken) {
					gapi.client.setToken({ access_token: accessToken })
				}

				resolve()
			} catch (error) {
				console.error('GAPI Init Error:', error)
				reject(error)
			}
		})
	})
}

// Check if user is signed in to Google
export const isSignedIn = () => {
	return !!accessToken
}

// Sign in to Google
export const signIn = async () => {
	return new Promise((resolve, reject) => {
		try {
			if (!tokenClient) {
				reject(new Error('Google Client not initialized'))
				return
			}

			// Define the callback for this specific sign-in attempt
			tokenClient.callback = async (response) => {
				if (response.error !== undefined) {
					reject(response)
					return
				}
				accessToken = response.access_token
				localStorage.setItem('google_calendar_token', accessToken)
				gapi.client.setToken({ access_token: accessToken })
				resolve(true)
			}

			if (gapi.client.getToken() === null) {
				// Prompt the user to select a Google Account and ask for consent to share their data
				tokenClient.requestAccessToken({ prompt: 'consent' })
			} else {
				// Skip display of account chooser and consent dialog for an existing session
				tokenClient.requestAccessToken({ prompt: '' })
			}
		} catch (error) {
			console.error('Sign-in Error:', error)
			reject(error)
		}
	})
}

// Sign out from Google
export const signOut = async () => {
	try {
		accessToken = null
		localStorage.removeItem('google_calendar_token')
		google.accounts.oauth2.revoke(accessToken, () => {
			console.log('Token revoked')
		})
		return true
	} catch (error) {
		console.error('Error signing out from Google:', error)
		return false
	}
}

// Fetch calendar events for a specific time range
export const fetchCalendarEvents = async (timeMin, timeMax) => {
	try {
		console.log(`Fetching events from ${timeMin} to ${timeMax}...`)

		if (!gapi.client.calendar) {
			console.error('Google Calendar API client not loaded')
			throw new Error('Calendar API client not ready. Please refresh.')
		}

		const response = await gapi.client.calendar.events.list({
			calendarId: 'primary',
			timeMin: timeMin,
			timeMax: timeMax,
			showDeleted: false,
			singleEvents: true,
			maxResults: 100,
			orderBy: 'startTime',
		})

		const items = response.result.items || []
		console.log(`Successfully fetched ${items.length} events`)
		return items
	} catch (error) {
		console.error('Error fetching calendar events:', error)

		// Handle unauthorized error (token expired)
		if (error.status === 401) {
			console.log('Token expired or unauthorized, clearing token...')
			accessToken = null
			localStorage.removeItem('google_calendar_token')
			gapi.client.setToken(null)
		}

		throw error
	}
}

// Create a calendar event
export const createCalendarEvent = async (event) => {
	try {
		const response = await gapi.client.calendar.events.insert({
			calendarId: 'primary',
			resource: event,
		})
		return response.result
	} catch (error) {
		console.error('Error creating calendar event:', error)
		throw error
	}
}

// Update a calendar event
export const updateCalendarEvent = async (eventId, event) => {
	try {
		const response = await gapi.client.calendar.events.update({
			calendarId: 'primary',
			eventId: eventId,
			resource: event,
		})
		return response.result
	} catch (error) {
		console.error('Error updating calendar event:', error)
		throw error
	}
}

// Delete a calendar event
export const deleteCalendarEvent = async (eventId) => {
	try {
		await gapi.client.calendar.events.delete({
			calendarId: 'primary',
			eventId: eventId,
		})
		return true
	} catch (error) {
		console.error('Error deleting calendar event:', error)
		throw error
	}
}

// Get list of user's calendars
export const fetchCalendarList = async () => {
	try {
		const response = await gapi.client.calendar.calendarList.list()
		return response.result.items || []
	} catch (error) {
		console.error('Error fetching calendar list:', error)
		throw error
	}
}

// Convert task to Google Calendar event format
export const taskToCalendarEvent = (task) => {
	const startDateTime = task.dueDate ? new Date(task.dueDate) : new Date()
	const endDateTime = new Date(startDateTime)
	endDateTime.setHours(endDateTime.getHours() + 1) // Default 1 hour duration

	return {
		summary: task.title || 'Untitled Task',
		description: task.description || '',
		start: {
			dateTime: startDateTime.toISOString(),
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
		end: {
			dateTime: endDateTime.toISOString(),
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
		colorId: task.priority === 'high' ? '11' : task.priority === 'medium' ? '5' : '2',
		reminders: {
			useDefault: false,
			overrides: [
				{ method: 'email', minutes: 24 * 60 },
				{ method: 'popup', minutes: 30 },
			],
		},
	}
}
