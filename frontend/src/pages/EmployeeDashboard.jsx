import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUserContext from '../hooks/useUserContext'
import { getPreferredDashboardPath, isManager } from '../utils/dashboardRoutes'

const EmployeeDashboard = () => {
	const { user } = useAuthStore()
	const navigate = useNavigate()
	const { context, loading, error, refreshContext } = useUserContext()

	useEffect(() => {
		if (!user && !loading) {
			navigate('/', { replace: true })
		}
	}, [user, loading, navigate])

	useEffect(() => {
		if (context && (context.orgRole === 'ORG_ADMIN' || isManager(context))) {
			const destination = getPreferredDashboardPath(context)
			navigate(destination, { replace: true })
		}
	}, [context, navigate])

	if (!user) {
		return null
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="max-w-xl w-full rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-2xl">
					<p className="text-lg font-semibold text-rose-600">Unable to load dashboard</p>
					<p className="text-sm text-slate-600 mt-2">{error}</p>
					<button onClick={refreshContext} className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Retry</button>
				</div>
			</div>
		)
	}

	if (loading || !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading your dashboard…</div>
		)
	}

	const teams = context.teams || []

	return (
		<div className="min-h-screen bg-white px-6 py-12">
			<div className="mx-auto max-w-4xl space-y-8">
				<header>
					<p className="text-xs uppercase tracking-[0.4em] text-slate-500">Personal space</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome back</h1>
					<p className="text-sm text-slate-600">Your meetings, tasks, and rituals will land here.</p>
				</header>

				<section className="grid gap-4 md:grid-cols-2">
					<div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-2xl">
						<p className="text-sm font-semibold text-white/70">My tasks</p>
						<p className="text-3xl font-semibold mt-2">0</p>
						<p className="text-xs text-white/70">Task stream arrives soon.</p>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
						<p className="text-sm font-semibold text-slate-600">Calendar</p>
						<p className="text-3xl font-semibold text-slate-900 mt-2">No sync</p>
						<p className="text-xs text-slate-500">Connect Google Calendar later.</p>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-slate-900">My teams</h2>
						<span className="text-sm text-slate-500">{teams.length} memberships</span>
					</div>
					<div className="mt-4 space-y-4">
						{teams.length === 0 && <p className="text-sm text-slate-500">You are not part of any team yet.</p>}
						{teams.map((team) => (
							<div key={team.teamId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-base font-semibold text-slate-900">{team.teamName}</p>
										<p className="text-xs uppercase tracking-wide text-slate-500">{team.members?.length || 0} teammates</p>
									</div>
									<span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">{team.role}</span>
								</div>
								<ul className="mt-3 space-y-2 text-sm text-slate-600">
									{(team.members || []).slice(0, 4).map((member) => (
										<li key={`${team.teamId}-${member.uid}`}>{member.email || member.uid}</li>
									))}
									{(team.members || []).length === 0 && <li className="text-xs text-slate-500">No teammates listed yet.</li>}
								</ul>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	)
}

export default EmployeeDashboard
