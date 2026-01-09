import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUserContext from '../hooks/useUserContext'
import { getPreferredDashboardPath } from '../utils/dashboardRoutes'

const AdminDashboard = () => {
	const { user } = useAuthStore()
	const navigate = useNavigate()
	const { context, loading, error, refreshContext } = useUserContext()

	useEffect(() => {
		if (!user && !loading) {
			navigate('/', { replace: true })
		}
	}, [user, loading, navigate])

	useEffect(() => {
		if (context && context.orgRole !== 'ORG_ADMIN') {
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
					<p className="text-lg font-semibold text-rose-600">Unable to load org context</p>
					<p className="text-sm text-slate-600 mt-2">{error}</p>
					<button onClick={refreshContext} className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Retry</button>
				</div>
			</div>
		)
	}

	if (loading || !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading organization…</div>
		)
	}

	const orgInfo = context.organization || {}
	const orgTeams = context.orgTeams || []
	const orgMembers = context.orgMembers || []

	return (
		<div className="min-h-screen bg-slate-50 px-6 py-10">
			<div className="mx-auto max-w-6xl space-y-8">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.4em] text-slate-500">Organization Admin</p>
						<h1 className="mt-2 text-3xl font-semibold text-slate-900">{orgInfo.name || 'Unnamed Organization'}</h1>
						<p className="text-sm text-slate-600">Org ID: {context.orgId}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center">
						<p className="text-xs uppercase tracking-wide text-slate-500">Join Code</p>
						<p className="text-2xl font-mono font-semibold text-slate-900 mt-1">{orgInfo.joinCode || 'Hidden'}</p>
					</div>
				</header>

				<section className="grid gap-4 md:grid-cols-2">
					<Link to="#" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 hover:border-slate-400">
						<p className="text-sm font-semibold text-slate-600">Team Management</p>
						<p className="text-xl font-semibold text-slate-900 mt-2">Configure teams & roles</p>
						<p className="text-xs text-slate-500 mt-2">Coming soon</p>
					</Link>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
						<p className="text-sm font-semibold text-slate-600">Integrations</p>
						<p className="text-xl font-semibold text-slate-900 mt-2">Slack & GitHub</p>
						<p className="text-xs text-slate-500 mt-2">Static demo: both integrations are already connected.</p>
						<div className="mt-4 space-y-4">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-slate-800">Slack</p>
										<p className="text-xs text-slate-500">Slash commands are ready.</p>
									</div>
									<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Connected</span>
								</div>
								<label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Channel link (static)</label>
								<input disabled value="https://slack.com/app/StrataGem" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" />
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-slate-800">GitHub</p>
										<p className="text-xs text-slate-500">Issues sync is enabled.</p>
									</div>
									<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Connected</span>
								</div>
								<label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Repository (static)</label>
								<input disabled value="https://github.com/chinmay1p/GDG-NU-2026" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" />
							</div>
						</div>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-slate-900">Teams</h2>
						<span className="text-sm text-slate-500">{orgTeams.length} total</span>
					</div>
					<div className="mt-4 grid gap-4 md:grid-cols-2">
						{orgTeams.length === 0 && <p className="text-sm text-slate-500">No teams have been created yet.</p>}
						{orgTeams.map((team) => (
							<div key={team.teamId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<p className="text-base font-semibold text-slate-900">{team.teamName}</p>
								<p className="text-xs uppercase tracking-wide text-slate-500">{team.members?.length || 0} members</p>
								<ul className="mt-3 space-y-2 text-sm text-slate-600">
									{(team.members || []).slice(0, 3).map((member) => (
										<li key={`${team.teamId}-${member.uid}`}>{member.email} · {member.role}</li>
									))}
									{(team.members || []).length > 3 && <li className="text-xs text-slate-500">and more…</li>}
								</ul>
							</div>
						))}
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-slate-900">People</h2>
						<span className="text-sm text-slate-500">{orgMembers.length} users</span>
					</div>
					<div className="mt-4 overflow-x-auto">
						<table className="min-w-full text-left text-sm text-slate-600">
							<thead>
								<tr className="text-xs uppercase tracking-wide text-slate-500">
									<th className="py-2">Email</th>
									<th className="py-2">Role</th>
								</tr>
							</thead>
							<tbody>
								{orgMembers.map((member) => (
									<tr key={member.uid} className="border-b border-slate-100 last:border-0">
										<td className="py-2">{member.email || member.uid}</td>
										<td className="py-2 font-semibold">{member.role}</td>
									</tr>
								))}
								{orgMembers.length === 0 && (
									<tr>
										<td colSpan={2} className="py-4 text-slate-500">No members yet.</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	)
}

export default AdminDashboard
