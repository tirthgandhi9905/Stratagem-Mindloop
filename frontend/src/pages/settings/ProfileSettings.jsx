import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import useContextStore from '../../store/contextStore'
import { createExtensionSession } from '../../services/extensionSessionApi'

const ProfileSettings = () => {
	const { user, updateProfileName, error, loading, logout } = useAuthStore()
	const { context } = useContextStore()
	const [name, setName] = useState(user?.name || '')
	const [status, setStatus] = useState('')
	const [sessionInfo, setSessionInfo] = useState(null)
	const [sessionStatus, setSessionStatus] = useState('')
	const [sessionError, setSessionError] = useState('')
	const [sessionLoading, setSessionLoading] = useState(false)
	const [copied, setCopied] = useState(false)

	const handleSubmit = async (e) => {
		e.preventDefault()
		setStatus('Saving…')
		try {
			await updateProfileName(name)
			setStatus('Profile updated')
		} catch (err) {
			setStatus(err.message || 'Failed to update profile')
		}
	}

	const handleCreateSession = async () => {
		if (!context?.orgId) {
			setSessionError('Join or create an organization before connecting the extension.')
			return
		}

		setSessionLoading(true)
		setSessionError('')
		setSessionStatus('Generating session…')
		try {
			const result = await createExtensionSession({ orgId: context.orgId })
			setSessionInfo(result)
			setSessionStatus('Session generated. Paste it into the Chrome extension within 24 hours.')
		} catch (err) {
			setSessionError(err.message || 'Unable to create session')
			setSessionStatus('')
		} finally {
			setSessionLoading(false)
		}
	}

	const handleCopySession = async () => {
		if (!sessionInfo?.sessionId) {
			return
		}
		try {
			await navigator.clipboard.writeText(sessionInfo.sessionId)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			setSessionError('Clipboard copy failed. Copy manually if needed.')
		}
	}

	return (
		<div className="space-y-6">
			<header>
				<p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Settings</p>
				<h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Profile</h1>
				<p className="text-sm text-slate-600 dark:text-slate-400">Manage your account basics.</p>
			</header>

			<form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none space-y-4">
				<label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Display name</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
				/>
				<label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</label>
				<input
					type="email"
					value={user?.email || ''}
					readOnly
					className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm dark:text-slate-300"
				/>
				<button
					type="submit"
					disabled={loading}
					className="rounded-2xl bg-slate-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 disabled:opacity-60"
				>
					Save profile
				</button>
				{(status || error) && <p className="text-xs text-slate-500">{error || status}</p>}
			</form>

			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none space-y-4">
				<div>
					<p className="text-sm font-semibold text-slate-900 dark:text-white">Connect Chrome Extension</p>
					<p className="text-xs text-slate-500 dark:text-slate-400">Generate a one-time code for the Meeting Intelligence extension.</p>
				</div>
				<button
					onClick={handleCreateSession}
					disabled={sessionLoading || !context?.orgId}
					className="rounded-2xl bg-slate-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 disabled:opacity-60"
				>
					{sessionLoading ? 'Generating…' : 'Connect Chrome Extension'}
				</button>
				{sessionInfo && (
					<div className="space-y-2">
						<label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Session ID</label>
						<div className="flex flex-col gap-2 md:flex-row">
							<input
								value={sessionInfo.sessionId}
								readOnly
								className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
							/>
							<button
								onClick={handleCopySession}
								type="button"
								className="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white"
							>
								{copied ? 'Copied!' : 'Copy'}
							</button>
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Expires {sessionInfo.expiresAt ? new Date(sessionInfo.expiresAt).toLocaleString() : 'soon'}
						</p>
					</div>
				)}
				{sessionStatus && <p className="text-xs text-emerald-600">{sessionStatus}</p>}
				{sessionError && <p className="text-xs text-rose-500">{sessionError}</p>}
			</div>

			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none">
				<p className="text-sm font-semibold text-slate-900 dark:text-white">Sign out</p>
				<p className="text-xs text-slate-500 dark:text-slate-400">End your current session.</p>
				<button onClick={logout} className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-900 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
					Logout
				</button>
			</div>
		</div>
	)
}

export default ProfileSettings
