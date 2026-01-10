import { useCallback, useEffect, useMemo, useState } from 'react'
import useAuthStore from '../../store/authStore'
import useUserContext from '../../hooks/useUserContext'
import { isAdmin, isManager } from '../../utils/dashboardRoutes'
import { fetchTasks } from '../../services/tasksApi'
import useGoogleCalendar from '../../hooks/useGoogleCalendar'

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const priorityAccent = {
	low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
	medium: 'bg-amber-50 text-amber-700 border-amber-100',
	high: 'bg-rose-50 text-rose-700 border-rose-100',
}

const isCompletedStatus = (value = '') => (value || '').toUpperCase() === 'COMPLETED'

const formatKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

const Calendar = () => {
	const { user } = useAuthStore()
	const { context, loading: contextLoading, error: contextError, refreshContext } = useUserContext()
	const [currentMonth, setCurrentMonth] = useState(() => {
		const now = new Date()
		return new Date(now.getFullYear(), now.getMonth(), 1)
	})
	const [tasks, setTasks] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	// Google Calendar integration
	const googleCalendar = useGoogleCalendar()
	const [calendarEvents, setCalendarEvents] = useState([])

	const canManage = useMemo(() => isAdmin(context) || isManager(context), [context])

	const loadTasks = useCallback(async () => {
		if (!context || !user) return
		setLoading(true)
		setError(null)
		try {
			const query = { mine: !canManage ? true : undefined }
			const data = await fetchTasks(query)
			setTasks(data)
		} catch (err) {
			setError(err.message || 'Unable to load tasks')
		} finally {
			setLoading(false)
		}
	}, [context, user, canManage])

	const loadCalendarEvents = useCallback(async () => {
		if (!googleCalendar.isSignedIn) return
		try {
			const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
			const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59)
			// Use the function from the hook
			const events = await googleCalendar.fetchEvents(startOfMonth, endOfMonth)
			setCalendarEvents(events)
		} catch (err) {
			console.error('Failed to load calendar events:', err)
		}
		// We remove fetchEvents from dependencies to break the loop if it's unstable
		// but keep isSignedIn and currentMonth
	}, [googleCalendar.isSignedIn, currentMonth])

	useEffect(() => {
		if (!context || !user || contextLoading) return
		loadTasks()
	}, [context, user, contextLoading, loadTasks])

	useEffect(() => {
		if (googleCalendar.isSignedIn) {
			loadCalendarEvents()
		}
	}, [googleCalendar.isSignedIn, currentMonth, loadCalendarEvents])

	const firstVisibleDate = useMemo(() => {
		const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
		const offset = firstOfMonth.getDay()
		return new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - offset)
	}, [currentMonth])

	const calendarCells = useMemo(() => {
		return Array.from({ length: 42 }, (_, index) => {
			const date = new Date(firstVisibleDate)
			date.setDate(firstVisibleDate.getDate() + index)
			return {
				date,
				key: formatKey(date),
				inCurrentMonth: date.getMonth() === currentMonth.getMonth(),
			}
		})
	}, [currentMonth, firstVisibleDate])

	const tasksByDate = useMemo(() => {
		const grouped = {}

		// Add tasks
		tasks.forEach((task) => {
			if (isCompletedStatus(task.status)) return
			if (!task.dueDate) return
			const raw = typeof task.dueDate === 'string' ? task.dueDate : ''
			if (!raw) return
			const key = raw.slice(0, 10)
			if (!grouped[key]) grouped[key] = { tasks: [], events: [] }
			grouped[key].tasks.push(task)
		})

		// Add Google Calendar events
		calendarEvents.forEach((event) => {
			const startDate = event.start?.dateTime || event.start?.date
			if (!startDate) return
			const key = startDate.slice(0, 10)
			if (!grouped[key]) grouped[key] = { tasks: [], events: [] }
			grouped[key].events.push({
				id: event.id,
				title: event.summary || 'Untitled Event',
				isGoogleEvent: true,
				colorId: event.colorId,
				htmlLink: event.htmlLink,
			})
		})

		return grouped
	}, [tasks, calendarEvents])

	const unscheduledTasks = useMemo(() => tasks.filter((task) => !task.dueDate && !isCompletedStatus(task.status)), [tasks])
	const todayKey = formatKey(new Date())

	const handlePreviousMonth = () => {
		setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
	}

	const handleNextMonth = () => {
		setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
	}

	const handleToday = () => {
		const now = new Date()
		setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
	}

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
				<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8 text-center shadow-xl dark:shadow-none">
					<p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in to view the task calendar</p>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Authenticate with Google to continue.</p>
				</div>
			</div>
		)
	}

	if (contextError) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
				<div className="max-w-xl w-full rounded-3xl border border-rose-100 dark:border-rose-900/30 bg-white dark:bg-slate-800 p-8 text-center shadow-2xl dark:shadow-none">
					<p className="text-lg font-semibold text-rose-600 dark:text-rose-400">Unable to load workspace context</p>
					<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{contextError}</p>
					<button onClick={refreshContext} className="mt-6 rounded-full bg-slate-900 dark:bg-white px-5 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100">Retry</button>
				</div>
			</div>
		)
	}

	if (contextLoading || !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">Loading calendar…</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 px-6 py-10">
			<div className="mx-auto max-w-6xl space-y-8">
				<header className="space-y-3">
					<p className="text-xs uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-400">Custom calendar</p>
					<h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Upcoming tasks</h1>
				</header>

				<section className="rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-400">Month view</p>
							<h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{monthFormatter.format(currentMonth)}</h2>
						</div>
						<div className="flex flex-wrap gap-3">
							<button onClick={handlePreviousMonth} className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500">Previous</button>
							<button onClick={handleToday} className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500">Today</button>
							<button onClick={handleNextMonth} className="rounded-full bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100">Next</button>
						</div>
					</div>

					{/* Google Calendar Integration */}
					<div className="mt-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-950/20 p-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="flex items-center gap-3">
								<svg className="h-6 w-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
									<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
								</svg>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Google Calendar</p>
									<p className="text-xs text-slate-600 dark:text-slate-400">
										{googleCalendar.isSignedIn ? (
											<span className="text-green-600 dark:text-green-400">✓ Connected ({calendarEvents.length} events)</span>
										) : (
											<span>Not connected</span>
										)}
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								{googleCalendar.isSignedIn ? (
									<>
										<button
											onClick={async () => {
												const upcomingTasks = tasks
													.filter(t => t.dueDate && !isCompletedStatus(t.status))
													.slice(0, 5);

												if (upcomingTasks.length === 0) {
													alert('No upcoming tasks with due dates to sync.');
													return;
												}

												if (window.confirm(`Sync ${upcomingTasks.length} upcoming tasks to your Google Calendar?`)) {
													for (const task of upcomingTasks) {
														await googleCalendar.syncTaskToCalendar(task);
													}
													alert('Sync complete!');
													loadCalendarEvents();
												}
											}}
											className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
										>
											Sync Tasks to Google
										</button>
										<button
											onClick={loadCalendarEvents}
											disabled={googleCalendar.loading}
											className="rounded-full border border-blue-300 dark:border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
										>
											{googleCalendar.loading ? 'Syncing...' : 'Refresh'}
										</button>
										<button
											onClick={googleCalendar.signOut}
											className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500"
										>
											Disconnect
										</button>
									</>
								) : (
									<button
										onClick={googleCalendar.signIn}
										disabled={!googleCalendar.isInitialized || googleCalendar.loading}
										className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{!googleCalendar.isInitialized ? 'Initializing...' : googleCalendar.loading ? 'Connecting...' : 'Connect to Google Calendar'}
									</button>
								)}
							</div>
						</div>
						{googleCalendar.error && (
							<p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{googleCalendar.error}</p>
						)}
					</div>

					<div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
						<p>Tasks fetched: {tasks.length}</p>
						{loading && <p className="text-slate-400 dark:text-slate-500">Refreshing…</p>}
						<button onClick={loadTasks} className="text-indigo-600 dark:text-indigo-400 underline-offset-2 hover:underline">Refresh tasks</button>
						{error && <span className="text-rose-600 dark:text-rose-400">{error}</span>}
					</div>

					<div className="mt-6 grid grid-cols-7 gap-3">
						{dayLabels.map((label) => (
							<p key={label} className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
								{label}
							</p>
						))}
						{calendarCells.map(({ date, key, inCurrentMonth }) => {
							const dayData = tasksByDate[key] || { tasks: [], events: [] }
							const totalItems = dayData.tasks.length + dayData.events.length
							return (
								<div key={key} className={`h-32 rounded-2xl border p-3 ${inCurrentMonth ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600'} ${key === todayKey ? 'ring-2 ring-indigo-200 dark:ring-indigo-900' : ''}`}>
									<div className="flex items-center justify-between text-sm font-semibold">
										<span className={key === todayKey ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}>{date.getDate()}</span>
										{totalItems > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>}
									</div>
									<div className="mt-3 space-y-1">
										{/* Display tasks */}
										{dayData.tasks.slice(0, 2).map((task) => {
											const priority = (task.priority || 'medium').toLowerCase()
											const badgeStyle = priorityAccent[priority] || priorityAccent.medium
											return (
												<div key={task.taskId} className={`truncate rounded-xl border px-2 py-1 text-[11px] font-semibold ${badgeStyle}`}>
													{task.title || 'Untitled task'}
												</div>
											)
										})}
										{/* Display Google Calendar events */}
										{dayData.events.slice(0, 3 - dayData.tasks.slice(0, 2).length).map((event) => (
											<a
												key={event.id}
												href={event.htmlLink}
												target="_blank"
												rel="noreferrer"
												className="block truncate rounded-xl border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
												title={event.title}
											>
												📅 {event.title}
											</a>
										))}
										{totalItems > 3 && (
											<p className="text-[11px] text-slate-500 dark:text-slate-400">+{totalItems - 3} more</p>
										)}
									</div>
									{totalItems === 0 && inCurrentMonth && <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">No items</p>}
								</div>
							)
						})}
					</div>

					<div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-rose-400"></span>
							<span>High</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-amber-400"></span>
							<span>Medium</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-emerald-400"></span>
							<span>Low</span>
						</div>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-none">
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Unscheduled work</p>
							<h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Other tasks</h2>
						</div>
						<p className="text-sm text-slate-500 dark:text-slate-400">Assign a deadline from the Tasks page to see them on the calendar.</p>
					</div>
					<div className="mt-6 divide-y divide-slate-100 dark:divide-slate-700">
						{unscheduledTasks.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">All tasks are scheduled—nice work.</p>}
						{unscheduledTasks.map((task) => (
							<div key={task.taskId} className="py-4">
								<p className="text-base font-semibold text-slate-900 dark:text-white">{task.title || 'Untitled task'}</p>
								<p className="text-sm text-slate-600 dark:text-slate-400">{task.description || 'No details yet.'}</p>
								<div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
									<span>Assignee: <span className="font-semibold text-slate-700 dark:text-slate-300">{task.assignedToEmail || 'Unassigned'}</span></span>
									<span>Priority: <span className="font-semibold text-slate-700 dark:text-slate-300">{(task.priority || 'medium').toUpperCase()}</span></span>
									{task.githubIssueUrl && (
										<a href={task.githubIssueUrl} target="_blank" rel="noreferrer" className="font-semibold text-slate-700 dark:text-slate-300 underline-offset-2 hover:underline">GitHub issue</a>
									)}
								</div>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	)
}

export default Calendar
