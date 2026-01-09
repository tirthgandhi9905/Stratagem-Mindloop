import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUserContext from '../hooks/useUserContext'
import { userHasOrg } from '../utils/dashboardRoutes'

const OrgOnboarding = () => {
	const { user } = useAuthStore()
	const navigate = useNavigate()
	const { context, loading, error, refreshContext } = useUserContext()

	useEffect(() => {
		if (!user) {
			navigate('/signin', { replace: true })
		}
	}, [user, navigate])

	useEffect(() => {
		if (user && context && userHasOrg(context)) {
			navigate('/dashboard/overview', { replace: true })
		}
	}, [user, context, navigate])

	if (!user) {
		return null
	}

	if (loading && !context) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading workspace…</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-white px-6 py-16">
			<div className="mx-auto max-w-4xl space-y-8">
				<header className="text-center space-y-3">
					<p className="text-xs uppercase tracking-[0.4em] text-purple-400">Finish setup</p>
					<h1 className="text-4xl font-semibold text-slate-900">Bring StrataGem to your organization</h1>
					<p className="text-base text-slate-600">Create a new workspace or join an existing team to unlock dashboards, rituals, and automation.</p>
				</header>
				{error && (
					<div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
						{error}
						<button onClick={refreshContext} className="ml-4 text-rose-800 underline-offset-2 hover:underline">Retry</button>
					</div>
				)}
				<div className="grid gap-6 md:grid-cols-2">
					<div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-xl">
						<p className="text-xs uppercase tracking-[0.4em] text-purple-400">New to StrataGem</p>
						<h2 className="mt-3 text-2xl font-semibold text-slate-900">Create an organization</h2>
						<p className="mt-2 text-sm text-slate-600">Spin up a dedicated workspace, invite teammates, and share a join code in seconds.</p>
						<Link to="/create-org" className="mt-5 inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500">Create workspace</Link>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
						<p className="text-xs uppercase tracking-[0.4em] text-slate-400">Invited already</p>
						<h2 className="mt-3 text-2xl font-semibold text-slate-900">Join an organization</h2>
						<p className="mt-2 text-sm text-slate-600">Use the 6-digit join code from your admin to gain access to rituals, tasks, and dashboards.</p>
						<Link to="/join-org" className="mt-5 inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-700">Enter join code</Link>
					</div>
				</div>
			</div>
		</div>
	)
}

export default OrgOnboarding
