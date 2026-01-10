import { NavLink } from 'react-router-dom'
import { getUserTier, isAdmin, isManager } from '../../utils/dashboardRoutes'

const Sidebar = ({ context }) => {
	const tier = getUserTier(context)
	const navItems = buildNavItems(context)

	return (
		<aside className="hidden w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6 md:flex md:flex-col">
			<div className="mb-8">
				<p className="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Workspace</p>
				<h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{context.organization?.name || 'Organization'}</h2>
				<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{tier}</p>
			</div>
			<nav className="flex flex-1 flex-col gap-1">
				{navItems.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						className={({ isActive }) =>
							`rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-800 ${isActive ? 'bg-slate-900 dark:bg-slate-700 text-white hover:text-black dark:hover:text-slate-200 shadow-lg shadow-slate-900/15 dark:shadow-slate-900/40' : 'text-slate-600 dark:text-slate-400'
							}`
						}
					>
						{item.label}
					</NavLink>
				))}
			</nav>
			<div className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600">© {new Date().getFullYear()}</div>
		</aside>
	)
}

const buildNavItems = (context) => {
	const admin = isAdmin(context)
	const manager = isManager(context)

	const items = [
		{ label: 'Overview', to: '/dashboard/overview', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
		{ label: 'Teams', to: '/dashboard/teams', roles: ['ADMIN', 'MANAGER'] },
		{ label: 'Members', to: '/dashboard/members', roles: ['ADMIN'] },
		{ label: 'Tasks', to: '/dashboard/tasks', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
		{ label: 'Calendar', to: '/dashboard/calendar', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
		{ label: 'Meetings', to: '/dashboard/meetings', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
		{ label: 'Integrations', to: '/dashboard/integrations', roles: ['ADMIN'] },
	]

	const settingsPath = admin
		? '/dashboard/settings/organization'
		: manager
			? '/dashboard/settings/profile'
			: '/dashboard/settings/profile'

	items.push({ label: 'Settings', to: settingsPath, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] })

	const tier = admin ? 'ADMIN' : manager ? 'MANAGER' : 'EMPLOYEE'
	return items.filter((item) => item.roles.includes(tier))
}

export default Sidebar
