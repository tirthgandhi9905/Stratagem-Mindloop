import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { joinOrganization } from '../services/orgApi'

const JoinOrganization = () => {
	const { user } = useAuthStore()
	const [joinCode, setJoinCode] = useState('')
	const [status, setStatus] = useState('')
	const [role, setRole] = useState('')
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleJoin = async (e) => {
		e.preventDefault()
		if (!joinCode.trim()) {
			setStatus('Enter the join code shared by your admin.')
			return
		}
		try {
			setLoading(true)
			setStatus('Joining organization…')
			const result = await joinOrganization({ joinCode: joinCode.trim() })
			setRole(result.role)
			setStatus('Welcome aboard! You are now part of this organization.')
		} catch (err) {
			setStatus(err.message || 'Failed to join organization.')
		} finally {
			setLoading(false)
		}
	}

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="rounded-2xl bg-white shadow-lg p-8 text-center max-w-md w-full">
					<p className="text-lg text-slate-700">Please sign in to join an organization.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
			<div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-10 border border-slate-100">
				<button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 mb-6">← Back</button>
				<h2 className="text-3xl font-semibold text-slate-900 mb-2">Join an Organization</h2>
				<p className="text-sm text-slate-600 mb-8">Paste your invite code to connect your meetings with your team.</p>
				<form onSubmit={handleJoin} className="space-y-5">
					<div>
						<label className="text-xs uppercase tracking-wide text-slate-500">Join Code</label>
						<input
							type="text"
							value={joinCode}
							onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
							className="w-full rounded-2xl border border-slate-200 px-4 py-3 mt-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
							placeholder="ABC123"
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
					>
						{loading ? 'Joining…' : 'Join Organization'}
					</button>
				</form>
				{status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
				{role && (
					<p className="mt-2 text-xs text-slate-500">Role assigned: <span className="font-semibold text-slate-800">{role}</span></p>
				)}
			</div>
		</div>
	)
}

export default JoinOrganization
