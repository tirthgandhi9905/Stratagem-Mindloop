import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import CreateMeetingModal from '../components/meetings/CreateMeetingModal'
import { createMeeting, fetchMeetings } from '../services/meetingApi'
import { isAdmin, isManager } from '../utils/dashboardRoutes'

const statusStyles = {
	SCHEDULED: 'bg-slate-100 text-slate-700',
	ACTIVE: 'bg-emerald-100 text-emerald-700',
	ENDED: 'bg-slate-200 text-slate-600',
}

const Meetings = () => {
	const { context } = useOutletContext()
	const adminUser = isAdmin(context)
	const managerUser = isManager(context)
	const canSchedule = adminUser || managerUser
	const belongsToTeam = ((context?.teams || []).length > 0) || ((context?.orgTeams || []).length > 0)
	const canViewMeetings = canSchedule || belongsToTeam

	const schedulerTeams = useMemo(() => {
		if (!context) return []
		if (adminUser) {
			return (context.orgTeams || []).map((team) => ({ teamId: team.teamId, teamName: team.teamName || 'Untitled team' }))
		}
		if (managerUser) {
			return (context.teams || []).filter((team) => (team.role || '').toUpperCase() === 'MANAGER')
		}
		return []
	}, [context, adminUser, managerUser])

	const teamDirectory = useMemo(() => {
		if (!context) return []
		return (context.orgTeams || []).map((team) => ({ teamId: team.teamId, teamName: team.teamName || 'Untitled team' }))
	}, [context])

	const [meetings, setMeetings] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [isModalOpen, setModalOpen] = useState(false)
	const [latestMeeting, setLatestMeeting] = useState(null)

	const loadMeetings = useCallback(async () => {
		if (!canViewMeetings) return
		setLoading(true)
		setError(null)
		try {
			const data = await fetchMeetings()
			setMeetings(Array.isArray(data) ? data : [])
		} catch (err) {
			setError(err.message || 'Failed to load meetings')
		} finally {
			setLoading(false)
		}
	}, [canViewMeetings])

	useEffect(() => {
		loadMeetings()
	}, [loadMeetings])


	const handleCreateMeeting = async (payload) => {
		const created = await createMeeting(payload)
		setLatestMeeting({ topic: created.topic, joinUrl: created.joinUrl, startUrl: created.startUrl })
		await loadMeetings()
		return created
	}

	if (!canViewMeetings) {
		return (
			<div className="min-h-screen bg-slate-50 px-6 py-10">
				<div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
					<p className="text-xs uppercase tracking-[0.35em] text-slate-500">Meetings</p>
					<h1 className="mt-3 text-3xl font-semibold text-slate-900">No teams yet</h1>
					<p className="mt-3 text-sm text-slate-600">Join a team to see upcoming Zoom meetings.</p>
				</div>
			</div>
		)
	}

	const formatDate = (value) => {
		if (!value) return '—'
		const date = new Date(value)
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white px-6 py-10">
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.35em] text-slate-500">Meetings</p>
						<h1 className="text-3xl font-semibold text-slate-900">Team Meetings</h1>
						<p className="text-sm text-slate-600">Track, schedule, and monitor Zoom sessions for every team.</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<button
							onClick={loadMeetings}
							className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-500"
						>
							Refresh
						</button>
						{canSchedule && (
							<button
								onClick={() => setModalOpen(true)}
								disabled={!schedulerTeams.length}
								className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
							>
								Create Meeting
							</button>
						)}
					</div>
				</header>

				{latestMeeting && (
					<section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
						<p className="text-xs uppercase tracking-[0.35em]">Latest Zoom meeting</p>
						<h2 className="mt-1 text-xl font-semibold">{latestMeeting.topic || 'Zoom meeting'}</h2>
						<div className="mt-3 grid gap-4 md:grid-cols-2">
							{latestMeeting.joinUrl && (
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.3em]">Join link</p>
									<a href={latestMeeting.joinUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-emerald-800 underline">
										{latestMeeting.joinUrl}
									</a>
								</div>
							)}
							{latestMeeting.startUrl && (
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.3em]">Host link</p>
									<a href={latestMeeting.startUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-emerald-800 underline">
										{latestMeeting.startUrl}
									</a>
								</div>
							)}
						</div>
					</section>
				)}

				<section className="rounded-3xl border border-slate-200 bg-white shadow-xl">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200 text-sm">
							<thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
								<tr>
									<th className="px-6 py-3">Topic</th>
									<th className="px-6 py-3">Team</th>
									<th className="px-6 py-3">Status</th>
									<th className="px-6 py-3">Start time</th>
									<th className="px-6 py-3">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading && (
									<tr>
										<td colSpan={5} className="px-6 py-6 text-center text-slate-500">
											Loading meetings…
										</td>
									</tr>
								)}
								{!loading && error && (
									<tr>
										<td colSpan={5} className="px-6 py-6 text-center text-rose-600">
											{error}
										</td>
									</tr>
								)}
								{!loading && !error && meetings.length === 0 && (
									<tr>
										<td colSpan={5} className="px-6 py-6 text-center text-slate-500">
											No meetings scheduled yet.
										</td>
									</tr>
								)}
								{meetings.map((meeting) => {
									const statusKey = (meeting.status || '').toUpperCase()
									const statusLabel = statusKey === 'ACTIVE' ? 'Active' : statusKey === 'ENDED' ? 'Ended' : 'Scheduled'
									return (
									<tr key={meeting.meetingId}>
										<td className="px-6 py-4">
											<p className="font-semibold text-slate-900">{meeting.topic || 'Zoom meeting'}</p>
											<p className="text-xs text-slate-500">ID: {meeting.zoomMeetingId || '—'}</p>
										</td>
										<td className="px-6 py-4 text-slate-600">{resolveTeamName(meeting.teamId, teamDirectory)}</td>
										<td className="px-6 py-4">
												<span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[statusKey] || 'bg-slate-100 text-slate-700'}`}>
													{statusLabel}
												</span>
										</td>
										<td className="px-6 py-4 text-slate-600">{formatDate(meeting.startTime)}</td>
										<td className="px-6 py-4">
											<div className="flex flex-wrap gap-2">
												{meeting.joinUrl && (
													<a href={meeting.joinUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-500">
														Join
													</a>
												)}
												{meeting.startUrl && canSchedule && (
													<a href={meeting.startUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-900 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50">
														Host
													</a>
												)}
											</div>
										</td>
									</tr>
										)
									})}
							</tbody>
						</table>
					</div>
				</section>
			</div>
			{canSchedule && <CreateMeetingModal open={isModalOpen} onClose={() => setModalOpen(false)} teams={schedulerTeams} onCreate={handleCreateMeeting} />}
		</div>
	)
}

const resolveTeamName = (teamId, teams) => {
	const team = teams.find((item) => item.teamId === teamId)
	return team?.teamName || teamId || '—'
}

export default Meetings