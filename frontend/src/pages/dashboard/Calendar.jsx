import { useCallback, useEffect, useMemo, useState } from 'react'
import useAuthStore from '../../store/authStore'
import useUserContext from '../../hooks/useUserContext'
import { isAdmin, isManager } from '../../utils/dashboardRoutes'
import { fetchTasks } from '../../services/tasksApi'

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

	useEffect(() => {
		if (!context || !user || contextLoading) return
		loadTasks()
	}, [context, user, contextLoading, loadTasks])

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
		return tasks.reduce((acc, task) => {
			if (isCompletedStatus(task.status)) return acc
			if (!task.dueDate) return acc
			const raw = typeof task.dueDate === 'string' ? task.dueDate : ''
			if (!raw) return acc
			const key = raw.slice(0, 10)
			if (!acc[key]) acc[key] = []
			acc[key].push(task)
			return acc
		}, {})
	}, [tasks])

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
							const tasksForDay = tasksByDate[key] || []
							return (
								<div key={key} className={`h-32 rounded-2xl border p-3 ${inCurrentMonth ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600'} ${key === todayKey ? 'ring-2 ring-indigo-200 dark:ring-indigo-900' : ''}`}>
									<div className="flex items-center justify-between text-sm font-semibold">
										<span className={key === todayKey ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}>{date.getDate()}</span>
										{tasksForDay.length > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{tasksForDay.length} task{tasksForDay.length === 1 ? '' : 's'}</span>}
									</div>
									<div className="mt-3 space-y-1">
										{tasksForDay.slice(0, 3).map((task) => {
											const priority = (task.priority || 'medium').toLowerCase()
											const badgeStyle = priorityAccent[priority] || priorityAccent.medium
											return (
												<div key={task.taskId} className={`truncate rounded-xl border px-2 py-1 text-[11px] font-semibold ${badgeStyle}`}>{task.title || 'Untitled task'}</div>
											)
										})}
										{tasksForDay.length > 3 && (
											<p className="text-[11px] text-slate-500 dark:text-slate-400">+{tasksForDay.length - 3} more</p>
										)}
									</div>
									{tasksForDay.length === 0 && inCurrentMonth && <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">No deadlines</p>}
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
