import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isAdmin } from '../../utils/dashboardRoutes'
import { createExtensionSession } from '../../services/extensionSessionApi'

const OrganizationSettings = () => {
	const { context } = useOutletContext()
	const admin = isAdmin(context)
	const [copyStatus, setCopyStatus] = useState('')
	const [sessionInfo, setSessionInfo] = useState(null)
	const [sessionStatus, setSessionStatus] = useState('')
	const [sessionError, setSessionError] = useState('')
	const [sessionLoading, setSessionLoading] = useState(false)
	const [sessionCopied, setSessionCopied] = useState(false)

	if (!admin) {
		return <Restricted />
	}

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(context.organization?.joinCode || '')
			setCopyStatus('Join code copied')
			setTimeout(() => setCopyStatus(''), 2000)
		} catch (err) {
			setCopyStatus('Unable to copy join code')
		}
	}

	const handleCreateSession = async () => {
		setSessionLoading(true)
		setSessionStatus('Generating session…')
		setSessionError('')
		setSessionInfo(null)
		try {
			const result = await createExtensionSession({ orgId: context.organization?.orgId || context.orgId })
			setSessionInfo(result)
			setSessionStatus('Session generated. Paste it into the extension within 24 hours.')
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
			setSessionCopied(true)
			setTimeout(() => setSessionCopied(false), 2000)
		} catch (err) {
			setSessionError('Clipboard copy failed. Copy manually if needed.')
		}
	}

	return (
		<div className="space-y-6">
			<header>
				<p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Settings</p>
				<h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Organization</h1>
				<p className="text-sm text-slate-600 dark:text-slate-400">Workspace identity and access controls.</p>
			</header>

			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none space-y-4">
				<div>
					<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Organization name</p>
					<p className="text-xl font-semibold text-slate-900 dark:text-white">{context.organization?.name}</p>
				</div>
				<div>
					<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</p>
					<p className="text-sm text-slate-600 dark:text-slate-400">{context.organization?.description || 'No description set.'}</p>
				</div>
				<div className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3">
					<div>
						<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Join code</p>
						<p className="text-lg font-semibold text-slate-900 dark:text-white">{context.organization?.joinCode}</p>
					</div>
					<button onClick={handleCopy} className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
						Copy
					</button>
				</div>
				{copyStatus && <p className="text-xs text-slate-500 dark:text-slate-400">{copyStatus}</p>}
			</div>

			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none space-y-4">
				<div>
					<p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Connect Chrome Extension</p>
					<p className="text-sm text-slate-600 dark:text-slate-400">Generate an admin session token for the extension.</p>
				</div>
				<button
					onClick={handleCreateSession}
					disabled={sessionLoading}
					className="rounded-2xl bg-slate-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 disabled:opacity-60"
				>
					{sessionLoading ? 'Generating…' : 'Create session token'}
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
								{sessionCopied ? 'Copied!' : 'Copy'}
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
		</div>
	)
}

const Restricted = () => (
	<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8 text-center shadow-xl dark:shadow-none">
		<p className="text-sm text-slate-600 dark:text-slate-400">Only organization admins can access these settings.</p>
	</div>
)

export default OrganizationSettings
