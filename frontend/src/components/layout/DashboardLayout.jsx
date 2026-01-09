import { useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useUserContext from '../../hooks/useUserContext'
import useTaskDetectionPrompt from '../../hooks/useTaskDetectionPrompt'
import { getPreferredDashboardPath, userHasOrg } from '../../utils/dashboardRoutes'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TaskDetectionModal from '../TaskDetectionModal'

const DashboardLayout = () => {
	const { user, logout } = useAuthStore()
	const navigate = useNavigate()
	const { context, loading, error, refreshContext } = useUserContext()
	const { pendingTask, status, approveTask, rejectTask, clearStatus } = useTaskDetectionPrompt()

	useEffect(() => {
		if (!user && !loading) {
			navigate('/', { replace: true })
		}
	}, [user, loading, navigate])

	useEffect(() => {
		if (context && userHasOrg(context)) {
			const preferred = getPreferredDashboardPath(context)
			if (window.location.pathname === '/dashboard') {
				navigate(preferred, { replace: true })
			}
		}
	}, [context, navigate])

	if (!user) {
		return null
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
				<div className="max-w-xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8 text-center shadow-2xl dark:shadow-none space-y-4">
					<p className="text-lg font-semibold text-slate-900 dark:text-white">We hit a snag</p>
					<p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
					<div className="flex flex-wrap gap-3 justify-center text-sm">
						<button
							onClick={refreshContext}
							className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:border-slate-500 dark:hover:border-slate-400"
						>
							Retry
						</button>
						<Link
							to="/create-org"
							className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
						>
							Create Org
						</Link>
						<Link
							to="/join-org"
							className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:border-slate-500 dark:hover:border-slate-400"
						>
							Join Org
						</Link>
					</div>
				</div>
			</div>
		)
	}

	if (loading || !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
				Loading workspace…
			</div>
		)
	}

	if (!userHasOrg(context)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
				<div className="max-w-xl w-full rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-800 p-8 text-center shadow-2xl dark:shadow-none space-y-4">
					<p className="text-lg font-semibold text-amber-900 dark:text-amber-500">
						Finish setting up your organization
					</p>
					<p className="text-sm text-slate-600 dark:text-slate-400">
						Create a workspace or join an existing one to unlock the dashboard.
					</p>
					<div className="flex flex-wrap gap-3 justify-center text-sm">
						<Link
							to="/create-org"
							className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
						>
							Create Organization
						</Link>
						<Link
							to="/join-org"
							className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:border-slate-500 dark:hover:border-slate-400"
						>
							Join Organization
						</Link>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
			<Sidebar context={context} />
			<div className="flex flex-1 flex-col">
				<Topbar context={context} user={user} onLogout={logout} />
				<main className="flex-1 overflow-y-auto px-8 py-6">
					{/* ✅ FIX: pass user through Outlet context */}
					<Outlet context={{ user, context, refreshContext }} />
				</main>
			</div>

			{(pendingTask || status) && (
				<TaskDetectionModal
					task={pendingTask}
					status={status}
					onApprove={approveTask}
					onReject={rejectTask}
					onCloseStatus={clearStatus}
				/>
			)}
		</div>
	)
}

export default DashboardLayout
