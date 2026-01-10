import { useEffect, useState, useCallback, useMemo } from 'react'
import * as calendarService from '../services/googleCalendarService'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID

export const useGoogleCalendar = () => {
    const [isInitialized, setIsInitialized] = useState(false)
    const [isSignedIn, setIsSignedIn] = useState(false)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Initialize Google Calendar API
    useEffect(() => {
        if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID ||
            GOOGLE_API_KEY === 'your_google_api_key_here' ||
            GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
            setIsInitialized(false)
            setError('Please configure Google Calendar API credentials in .env')
            return
        }

        const loadScripts = async () => {
            try {
                // 1. Load the legacy GAPI script for Calendar Data
                const gapiPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = 'https://apis.google.com/js/api.js'
                    script.async = true
                    script.defer = true
                    script.onload = resolve
                    script.onerror = reject
                    document.body.appendChild(script)
                })

                // 2. Load the new GSI script for Authentication
                const gsiPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = 'https://accounts.google.com/gsi/client'
                    script.async = true
                    script.defer = true
                    script.onload = resolve
                    script.onerror = reject
                    document.body.appendChild(script)
                })

                await Promise.all([gapiPromise, gsiPromise])
                console.log('Google scripts loaded, initializing...')

                await calendarService.initGoogleCalendar(GOOGLE_API_KEY, GOOGLE_CLIENT_ID)
                setIsInitialized(true)
                setError(null)
                setIsSignedIn(calendarService.isSignedIn())
            } catch (err) {
                console.error('Failed to load Google scripts:', err)
                setError('Failed to load Google services. Check your internet connection.')
                setIsInitialized(false)
            }
        }

        loadScripts()
    }, [])

    // Sign in to Google
    const signIn = useCallback(async () => {
        console.log('Attempting Google sign-in...')
        try {
            setLoading(true)
            setError(null)
            const success = await calendarService.signIn()
            console.log('Sign-in result:', success)
            if (success) {
                setIsSignedIn(true)
            }
            return success
        } catch (err) {
            console.error('Sign-in error detail:', err)
            setError(`Failed to sign in: ${err.message || 'Check your browser restrictions or popup blocker'}`)
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    // Sign out from Google
    const signOut = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const success = await calendarService.signOut()
            if (success) {
                setIsSignedIn(false)
                setEvents([])
            }
            return success
        } catch (err) {
            console.error('Sign out error:', err)
            setError('Failed to sign out from Google Calendar')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch calendar events for a date range
    const fetchEvents = useCallback(async (startDate, endDate) => {
        if (!isSignedIn) {
            setError('Not signed in to Google Calendar')
            return []
        }

        try {
            setLoading(true)
            setError(null)
            const timeMin = startDate.toISOString()
            const timeMax = endDate.toISOString()
            const fetchedEvents = await calendarService.fetchCalendarEvents(timeMin, timeMax)
            setEvents(fetchedEvents)
            return fetchedEvents
        } catch (err) {
            console.error('Error fetching events:', err)
            setError('Failed to fetch calendar events')
            return []
        } finally {
            setLoading(false)
        }
    }, [isSignedIn])

    // Create a new calendar event
    const createEvent = useCallback(async (event) => {
        if (!isSignedIn) {
            setError('Not signed in to Google Calendar')
            return null
        }

        try {
            setLoading(true)
            setError(null)
            const createdEvent = await calendarService.createCalendarEvent(event)
            return createdEvent
        } catch (err) {
            console.error('Error creating event:', err)
            setError('Failed to create calendar event')
            return null
        } finally {
            setLoading(false)
        }
    }, [isSignedIn])

    // Update an existing calendar event
    const updateEvent = useCallback(async (eventId, event) => {
        if (!isSignedIn) {
            setError('Not signed in to Google Calendar')
            return null
        }

        try {
            setLoading(true)
            setError(null)
            const updatedEvent = await calendarService.updateCalendarEvent(eventId, event)
            return updatedEvent
        } catch (err) {
            console.error('Error updating event:', err)
            setError('Failed to update calendar event')
            return null
        } finally {
            setLoading(false)
        }
    }, [isSignedIn])

    // Delete a calendar event
    const deleteEvent = useCallback(async (eventId) => {
        if (!isSignedIn) {
            setError('Not signed in to Google Calendar')
            return false
        }

        try {
            setLoading(true)
            setError(null)
            await calendarService.deleteCalendarEvent(eventId)
            return true
        } catch (err) {
            console.error('Error deleting event:', err)
            setError('Failed to delete calendar event')
            return false
        } finally {
            setLoading(false)
        }
    }, [isSignedIn])

    // Sync task to Google Calendar
    const syncTaskToCalendar = useCallback(async (task) => {
        if (!isSignedIn) {
            setError('Not signed in to Google Calendar')
            return null
        }

        try {
            setLoading(true)
            setError(null)
            const calendarEvent = calendarService.taskToCalendarEvent(task)
            const createdEvent = await calendarService.createCalendarEvent(calendarEvent)
            return createdEvent
        } catch (err) {
            console.error('Error syncing task:', err)
            setError('Failed to sync task to calendar')
            return null
        } finally {
            setLoading(false)
        }
    }, [isSignedIn])

    const fetchEventsToReturn = useCallback(async (startDate, endDate) => {
        return await fetchEvents(startDate, endDate)
    }, [fetchEvents])

    const signInToReturn = useCallback(async () => {
        return await signIn()
    }, [signIn])

    const signOutToReturn = useCallback(async () => {
        return await signOut()
    }, [signOut])

    return useMemo(() => ({
        isInitialized,
        isSignedIn,
        events,
        loading,
        error,
        signIn: signInToReturn,
        signOut: signOutToReturn,
        fetchEvents: fetchEventsToReturn,
        createEvent,
        updateEvent,
        deleteEvent,
        syncTaskToCalendar,
    }), [
        isInitialized,
        isSignedIn,
        events,
        loading,
        error,
        signInToReturn,
        signOutToReturn,
        fetchEventsToReturn,
        createEvent,
        updateEvent,
        deleteEvent,
        syncTaskToCalendar
    ])
}

export default useGoogleCalendar
