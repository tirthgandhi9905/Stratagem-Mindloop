import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUserContext from '../hooks/useUserContext'
import { getPreferredDashboardPath, isManager } from '../utils/dashboardRoutes'

const ManagerDashboard = () => {
	const { user } = useAuthStore()
	const navigate = useNavigate()
	const { context, loading, error, refreshContext } = useUserContext()

	useEffect(() => {
		if (!user && !loading) {
			navigate('/', { replace: true })
		}
	}, [user, loading, navigate])

	useEffect(() => {
		if (context && !isManager(context)) {
			const destination = getPreferredDashboardPath(context)
			navigate(destination, { replace: true })
		}
	}, [context, navigate])

	const managedTeams = useMemo(() => {
		if (!context) return []
		const teamMap = new Map((context.orgTeams || []).map((team) => [team.teamId, team]))
		return (context.teams || [])
			.filter((team) => (team.role || '').toUpperCase() === 'MANAGER')
			.map((team) => ({
				...team,
				teamName: team.teamName,
				members: teamMap.get(team.teamId)?.members || team.members || [],
			}))
	}, [context])

	if (!user) {
		return null
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="max-w-xl w-full rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-2xl">
					<p className="text-lg font-semibold text-rose-600">Unable to load manager view</p>
					<p className="text-sm text-slate-600 mt-2">{error}</p>
					<button onClick={refreshContext} className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Retry</button>
				</div>
			</div>
		)
	}

	if (loading || !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading manager dashboard…</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-white to-slate-100 px-6 py-10">
			<div className="mx-auto max-w-5xl space-y-8">
				<header>
					<p className="text-xs uppercase tracking-[0.4em] text-slate-500">Team Manager</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">Leadership cockpit</h1>
					<p className="text-sm text-slate-600">Stay ahead of conversations, ownership, and rituals.</p>
				</header>

				<section className="grid gap-4 md:grid-cols-2">
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
						<p className="text-sm font-semibold text-slate-600">Pending tasks</p>
						<p className="text-2xl font-semibold text-slate-900 mt-2">0</p>
						<p className="text-xs text-slate-500">Task approvals & assignments coming soon.</p>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
						<p className="text-sm font-semibold text-slate-600">Upcoming meetings</p>
						<p className="text-2xl font-semibold text-slate-900 mt-2">0</p>
						<p className="text-xs text-slate-500">Meetings sync arrives in a later release.</p>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-slate-900">Teams you lead</h2>
						<span className="text-sm text-slate-500">{managedTeams.length} teams</span>
					</div>
					<div className="mt-4 space-y-4">
						{managedTeams.length === 0 && <p className="text-sm text-slate-500">No manager assignments yet.</p>}
						{managedTeams.map((team) => (
							<div key={team.teamId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="text-base font-semibold text-slate-900">{team.teamName}</p>
										<p className="text-xs uppercase tracking-wide text-slate-500">{team.members.length} members</p>
									</div>
									<span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">MANAGER</span>
								</div>
								<ul className="mt-3 space-y-2 text-sm text-slate-600">
									{team.members.map((member) => (
										<li key={`${team.teamId}-${member.uid}`} className="flex items-center justify-between">
											<span>{member.email || member.uid}</span>
											<span className="text-xs uppercase text-slate-500">{member.role}</span>
										</li>
									))}
									{team.members.length === 0 && <li className="text-xs text-slate-500">No members yet.</li>}
								</ul>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	)
}

export default ManagerDashboard
