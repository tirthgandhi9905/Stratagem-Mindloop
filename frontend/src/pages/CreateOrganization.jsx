import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { createOrganization } from '../services/orgApi'

const CreateOrganization = () => {
	const { user } = useAuthStore()
	const [orgName, setOrgName] = useState('')
	const [status, setStatus] = useState('')
	const [joinCode, setJoinCode] = useState('')
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleCreate = async (e) => {
		e.preventDefault()
		if (!orgName.trim()) {
			setStatus('Organization name is required.')
			return
		}
		try {
			setLoading(true)
			setStatus('Creating organization…')
			const result = await createOrganization({
				name: orgName.trim(),
				description: '',
			})
			setJoinCode(result.joinCode)
			setStatus('Organization created. Share the join code with your team.')
		} catch (err) {
			setStatus(err.message || 'Failed to create organization.')
		} finally {
			setLoading(false)
		}
	}

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="rounded-2xl bg-white shadow-lg p-8 text-center max-w-md w-full">
					<p className="text-lg text-slate-700">Please sign in to create an organization.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
			<div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-10 border border-slate-100">
				<button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 mb-6">← Back</button>
				<h2 className="text-3xl font-semibold text-slate-900 mb-2">Create an Organization</h2>
				<p className="text-sm text-slate-600 mb-8">Own your workspace. Invite teammates with a unique join code.</p>
				<form onSubmit={handleCreate} className="space-y-5">
					<div>
						<label className="text-xs uppercase tracking-wide text-slate-500">Organization Name</label>
						<input
							type="text"
							value={orgName}
							onChange={(e) => setOrgName(e.target.value)}
							className="w-full rounded-2xl border border-slate-200 px-4 py-3 mt-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
							placeholder="Ex: Moonshot Labs"
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
					>
						{loading ? 'Creating…' : 'Create Organization'}
					</button>
				</form>
				{status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
				{joinCode && (
					<div className="mt-6 rounded-2xl border border-dashed border-slate-400 p-4 text-center">
						<p className="text-xs uppercase tracking-wide text-slate-500">Join Code</p>
						<p className="text-2xl font-mono font-semibold text-slate-900 mt-2">{joinCode}</p>
					</div>
				)}
			</div>
		</div>
	)
}

export default CreateOrganization
