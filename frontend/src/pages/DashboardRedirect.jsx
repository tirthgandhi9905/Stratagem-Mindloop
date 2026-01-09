import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUserContext from '../hooks/useUserContext'
import { getPreferredDashboardPath } from '../utils/dashboardRoutes'

const DashboardRedirect = () => {
	const { user } = useAuthStore()
	const navigate = useNavigate()
	const { context, loading, error, refreshContext } = useUserContext()

	useEffect(() => {
		if (!user && !loading) {
			navigate('/', { replace: true })
		}
	}, [user, loading, navigate])

	useEffect(() => {
		// Navigate once loading is complete (whether context exists or not)
		if (!loading && !error) {
			const destination = getPreferredDashboardPath(context)
			navigate(destination, { replace: true })
		}
	}, [context, loading, error, navigate])

	if (error) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
				<div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl space-y-4 max-w-lg w-full">
					<p className="text-lg font-semibold text-slate-900">We need more info</p>
					<p className="text-sm text-slate-600">{error}. Create or join an organization to continue.</p>
					<div className="flex gap-3 justify-center text-sm">
						<button onClick={refreshContext} className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-500">Retry</button>
						<button onClick={() => navigate('/create-org')} className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">Create Org</button>
						<button onClick={() => navigate('/join-org')} className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-500">Join Org</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50">
			<div className="text-center text-slate-500">Loading your workspace…</div>
		</div>
	)
}

export default DashboardRedirect
