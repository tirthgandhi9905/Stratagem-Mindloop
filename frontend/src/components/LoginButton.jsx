import useAuthStore from '../store/authStore'

const LoginButton = () => {
	const { loginWithGoogle, loading, error } = useAuthStore()

	return (
		<div className="flex flex-col items-center gap-3">
			<button
				onClick={loginWithGoogle}
				disabled={loading}
				className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
			>
				<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-900 font-bold">
					G
				</span>
				{loading ? 'Signing in…' : 'Sign in with Google'}
			</button>
			{error && <p className="text-sm text-rose-600">{error}</p>}
		</div>
	)
}

export default LoginButton
