import { useEffect, useMemo, useState } from 'react'

const defaultValues = {
	topic: '',
	teamId: '',
	startTime: '',
	durationMinutes: 30,
}

const CreateMeetingModal = ({ open, onClose, teams = [], onCreate }) => {
	const [formValues, setFormValues] = useState(defaultValues)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState(null)

	const teamOptions = useMemo(() => teams.map((team) => ({ value: team.teamId, label: team.teamName || 'Untitled team' })), [teams])

	useEffect(() => {
		if (!open) return
		setFormValues((prev) => ({
			...defaultValues,
			teamId: teamOptions[0]?.value || prev.teamId || '',
		}))
		setError(null)
	}, [open, teamOptions])

	if (!open) {
		return null
	}

	const handleChange = (event) => {
		const { name, value } = event.target
		setFormValues((prev) => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError(null)
		const trimmedTopic = formValues.topic.trim()
		if (!trimmedTopic) {
			setError('Please provide a meeting topic.')
			return
		}
		if (trimmedTopic.length < 3) {
			setError('Topic must be at least 3 characters.')
			return
		}
		if (!formValues.teamId) {
			setError('Select a team to host the meeting.')
			return
		}
		if (!formValues.startTime) {
			setError('Choose a start time for the meeting.')
			return
		}
		const ts = new Date(formValues.startTime)
		if (Number.isNaN(ts.getTime())) {
			setError('Start time must be a valid date/time.')
			return
		}
		const isoStart = ts.toISOString()
		setSubmitting(true)
		try {
			const payload = {
				topic: trimmedTopic,
				teamId: formValues.teamId,
				startTime: isoStart,
				durationMinutes: Number(formValues.durationMinutes) || 30,
			}
			console.log('Creating Zoom meeting with payload', payload)
			await onCreate(payload)
			onClose()
		} catch (err) {
			setError(err.message || 'Failed to create meeting')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
			<div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
				<header className="mb-6 space-y-2">
					<p className="text-xs uppercase tracking-[0.35em] text-slate-500">Create meeting</p>
					<h2 className="text-2xl font-semibold text-slate-900">Schedule a Zoom session</h2>
					<p className="text-sm text-slate-600">We will create the Zoom meeting under your organization account.</p>
				</header>
				<form onSubmit={handleSubmit} className="space-y-5">
					<div>
						<label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Topic</label>
						<input
							type="text"
							name="topic"
							value={formValues.topic}
							onChange={handleChange}
							placeholder="Weekly sync"
							className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Team</label>
						<select
							name="teamId"
							value={formValues.teamId}
							onChange={handleChange}
							className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
							disabled={!teamOptions.length}
						>
							{!teamOptions.length && <option value="">No managed teams available</option>}
							{teamOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Start time</label>
							<input
								type="datetime-local"
								name="startTime"
								value={formValues.startTime}
								onChange={handleChange}
								className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
							/>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Duration (minutes)</label>
							<input
								type="number"
								name="durationMinutes"
								min={1}
								max={600}
								value={formValues.durationMinutes}
								onChange={handleChange}
								className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
							/>
						</div>
					</div>
					{error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
					<div className="flex flex-wrap items-center justify-between gap-3">
						<button
							type="button"
							onClick={onClose}
							className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || !teamOptions.length}
							className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
						>
							{submitting ? 'Scheduling…' : 'Create meeting'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default CreateMeetingModal