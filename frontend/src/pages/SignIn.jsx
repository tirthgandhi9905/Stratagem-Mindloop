import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUserContext from '../hooks/useUserContext'
import LoginButton from '../components/LoginButton'

const SignIn = () => {
	const navigate = useNavigate()
	const { signInWithEmail, loading, error, user } = useAuthStore()
	const { loading: contextLoading } = useUserContext()
	const [formState, setFormState] = useState({ email: '', password: '' })

	useEffect(() => {
		if (user && !contextLoading) {
			navigate('/loading', { replace: true })
		}
	}, [user, contextLoading, navigate])

	const handleSubmit = async (event) => {
		event.preventDefault()
		if (!formState.email.trim() || !formState.password.trim()) {
			return
		}
		await signInWithEmail(formState.email.trim(), formState.password)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-white px-6 py-16">
			<div className="mx-auto flex max-w-5xl flex-col gap-12 lg:flex-row">
				<div className="flex-1 space-y-6">
					<Link to="/" className="text-sm font-semibold text-purple-700 hover:text-purple-900">← Back to StrataGem</Link>
					<div>
						<p className="text-xs uppercase tracking-[0.4em] text-purple-400">Welcome back</p>
						<h1 className="mt-3 text-4xl font-semibold text-slate-900">Sign in to StrataGem</h1>
						<p className="mt-3 text-base text-slate-600">Enter your workspace credentials or continue with Google to access meetings, tasks, and rituals.</p>
					</div>
					<div className="rounded-3xl border border-purple-100 bg-white/80 p-6 shadow-xl backdrop-blur">
						<p className="text-sm font-semibold text-slate-700">Need an account?</p>
						<p className="text-sm text-slate-500">Create one in seconds.</p>
						<Link to="/signup" className="mt-4 inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500">Create account</Link>
					</div>
				</div>
				<div className="flex-1 rounded-3xl border border-purple-100 bg-white/80 p-10 shadow-2xl backdrop-blur">
					<form className="space-y-5" onSubmit={handleSubmit}>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
							<input
								type="email"
								name="email"
								placeholder="you@company.com"
								value={formState.email}
								onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
								className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-400 focus:bg-white focus:outline-none"
							/>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
							<input
								type="password"
								name="password"
								placeholder="••••••••"
								value={formState.password}
								onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
								className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-400 focus:bg-white focus:outline-none"
							/>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/40 transition hover:bg-purple-500 disabled:opacity-70"
						>
							{loading ? 'Signing in…' : 'Sign in'}
						</button>
					</form>
					<div className="my-8 flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-slate-400">
						<span className="h-px flex-1 bg-slate-200" />
						or
						<span className="h-px flex-1 bg-slate-200" />
					</div>
					<LoginButton />
					{error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
				</div>
			</div>
		</div>
	)
}

export default SignIn
