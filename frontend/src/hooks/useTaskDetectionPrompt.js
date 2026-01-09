import { useCallback, useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'
import { connectNotifications, subscribe } from '../services/notificationSocket'
import { createTask } from '../services/tasksApi'

export const useTaskDetectionPrompt = () => {
	const { user } = useAuthStore()
	const [pendingTask, setPendingTask] = useState(null)
	const [status, setStatus] = useState(null)

	useEffect(() => {
		if (!user) {
			return
		}

		let unsubscribe = null
		console.log('[TaskDetection] Initializing detection for user:', user.email)
		connectNotifications().then(() => {
			console.log('[TaskDetection] Notification socket connected')
		}).catch((error) => {
			console.warn('[TaskDetection] notification connection failed', error)
		})

		unsubscribe = subscribe('TASK_DETECTED', (payload) => {
			console.log('[TaskDetection] TASK_DETECTED event received:', payload)
			if (!payload) return
			setPendingTask((current) => {
				if (current?.triggerId && payload.triggerId && current.triggerId === payload.triggerId) {
					return current
				}
				return {
					triggerId: payload.triggerId,
					title: payload.title || 'Detected task',
					description: payload.description || 'Captured from meeting context.',
					assignedToEmail: payload.assignedToEmail,
					priority: (payload.priority || 'HIGH').toUpperCase(),
					source: payload.source || 'MEETING_AI',
				}
			})
		})

		return () => {
			if (unsubscribe) {
				unsubscribe()
			}
		}
	}, [user])

	const clearStatus = useCallback(() => setStatus(null), [])

	const approveTask = useCallback(async () => {
		if (!pendingTask) return
		setStatus({ state: 'working', message: 'Creating task…' })
		try {
			await createTask({
				title: pendingTask.title,
				description: pendingTask.description,
				assignedToEmail: (pendingTask.assignedToEmail || '').toLowerCase(),
				priority: (pendingTask.priority || 'HIGH').toLowerCase(),
				createGithubIssue: true,
			})
			setStatus({ state: 'success', message: 'Task created and synced to GitHub.' })
			setPendingTask(null)
		} catch (error) {
			setStatus({ state: 'error', message: error.message || 'Unable to create task.' })
		}
	}, [pendingTask])

	const rejectTask = useCallback(() => {
		setPendingTask(null)
		setStatus(null)
	}, [])

	return { pendingTask, status, approveTask, rejectTask, clearStatus }
}

export default useTaskDetectionPrompt
