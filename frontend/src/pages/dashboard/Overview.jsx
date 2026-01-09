import { useOutletContext } from 'react-router-dom'
import { isAdmin, isManager } from '../../utils/dashboardRoutes'

const Overview = () => {
	const { context } = useOutletContext()
	const admin = isAdmin(context)
	const manager = isManager(context)
	const orgMembers = context.orgMembers || []
	const orgTeams = context.orgTeams || []
	const userTeams = context.teams || []

	return (
		<div className="space-y-8">
			<header className="space-y-2">
				<p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Dashboard overview</p>
				<h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Welcome back</h1>
				<p className="text-sm text-slate-600 dark:text-slate-400">Your organization pulse at a glance.</p>
			</header>

			<section className="grid gap-4 md:grid-cols-3">
				{admin && (
					<Card title="Organization" value={context.organization?.name || 'Workspace'} subtitle={`${orgMembers.length} members`} />
				)}
				<Card title="Teams" value={orgTeams.length} subtitle="Active teams" />
				<Card title="My Teams" value={userTeams.length} subtitle="Assignments" />
			</section>

			{admin && (
				<section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-slate-900 dark:text-white">Admin snapshot</h2>
						<span className="text-sm text-slate-500 dark:text-slate-400">Join code: {context.organization?.joinCode || 'Hidden'}</span>
					</div>
					<div className="mt-4 grid gap-4 md:grid-cols-2">
						<div>
							<p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Teams</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
								{orgTeams.slice(0, 4).map((team) => (
									<li key={team.teamId}>{team.teamName} · {team.members?.length || 0} members</li>
								))}
								{orgTeams.length === 0 && <li>No teams yet.</li>}
							</ul>
						</div>
						<div>
							<p className="text-sm font-semibold text-slate-600 dark:text-slate-300">People</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
								{orgMembers.slice(0, 4).map((member) => (
									<li key={member.uid}>{member.email || member.uid} · {member.role}</li>
								))}
								{orgMembers.length === 0 && <li>No members yet.</li>}
							</ul>
						</div>
					</div>
				</section>
			)}

			{manager && !admin && (
				<section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none">
					<h2 className="text-xl font-semibold text-slate-900 dark:text-white">Teams you lead</h2>
					<div className="mt-4 space-y-3">
						{userTeams.filter((team) => (team.role || '').toUpperCase() === 'MANAGER').map((team) => (
							<div key={team.teamId} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
								<p className="text-base font-semibold text-slate-900 dark:text-white">{team.teamName}</p>
								<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{team.members?.length || 0} members</p>
							</div>
						))}
						{userTeams.filter((team) => (team.role || '').toUpperCase() === 'MANAGER').length === 0 && (
							<p className="text-sm text-slate-500">No manager assignments yet.</p>
						)}
					</div>
				</section>
			)}

			{!admin && !manager && (
				<section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none">
					<h2 className="text-xl font-semibold text-slate-900 dark:text-white">My teams</h2>
					<div className="mt-4 space-y-3">
						{userTeams.map((team) => (
							<div key={team.teamId} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-base font-semibold text-slate-900 dark:text-white">{team.teamName}</p>
										<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{team.members?.length || 0} teammates</p>
									</div>
									<span className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{team.role}</span>
								</div>
							</div>
						))}
						{userTeams.length === 0 && <p className="text-sm text-slate-500">No team memberships yet.</p>}
					</div>
				</section>
			)}
		</div>
	)
}

const Card = ({ title, value, subtitle }) => (
	<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-lg dark:shadow-none">
		<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
		<p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
		<p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
	</div>
)

export default Overview
