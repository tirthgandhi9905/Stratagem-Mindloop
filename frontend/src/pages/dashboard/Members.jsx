import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isAdmin } from '../../utils/dashboardRoutes'
import {
	addMemberToTeam,
	updateTeamMemberRole,
	removeTeamMember,
} from '../../services/teamApi'

const Members = () => {
	const { context, refreshContext } = useOutletContext()
	const admin = isAdmin(context)
	const members = context.orgMembers || []
	const teams = context.orgTeams || []

	const memberTeamsMap = useMemo(() => {
		const map = {}
		teams.forEach((team) => {
			(team.members || []).forEach((member) => {
				if (!map[member.uid]) {
					map[member.uid] = []
				}
				map[member.uid].push({
					teamId: team.teamId,
					teamName: team.teamName,
					role: member.role,
				})
			})
		})
		return map
	}, [teams])

	const [selectedMemberId, setSelectedMemberId] = useState(() => members[0]?.uid || null)
	const selectedMember = members.find((member) => member.uid === selectedMemberId) || null
	const [assignTeamId, setAssignTeamId] = useState('')
	const [assignRole, setAssignRole] = useState('EMPLOYEE')
	const [status, setStatus] = useState('')

	const availableTeams = teams.filter(
		(team) => !memberTeamsMap[selectedMemberId || '']?.some((entry) => entry.teamId === team.teamId)
	)

	const handleAssign = async (e) => {
		e.preventDefault()
		if (!admin || !selectedMemberId) return
		if (!assignTeamId) {
			setStatus('Choose a team first')
			return
		}
		try {
			setStatus('Assigning…')
			await addMemberToTeam(assignTeamId, { userId: selectedMemberId, role: assignRole })
			setAssignTeamId('')
			setAssignRole('EMPLOYEE')
			await refreshContext()
			setStatus('Member assigned')
		} catch (err) {
			setStatus(err.message || 'Failed to assign member')
		}
	}

	const handleRoleChange = async (teamId, role) => {
		if (!admin || !selectedMemberId) return
		try {
			setStatus('Updating role…')
			await updateTeamMemberRole(teamId, selectedMemberId, role)
			await refreshContext()
			setStatus('Role updated')
		} catch (err) {
			setStatus(err.message || 'Unable to update role')
		}
	}

	const handleRemove = async (teamId) => {
		if (!admin || !selectedMemberId) return
		try {
			setStatus('Removing…')
			await removeTeamMember(teamId, selectedMemberId)
			await refreshContext()
			setStatus('Member removed from team')
		} catch (err) {
			setStatus(err.message || 'Failed to remove member')
		}
	}

	return (
		<div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-semibold text-slate-900 dark:text-white">Organization members</h1>
					<span className="text-sm text-slate-500 dark:text-slate-400">{members.length} total</span>
				</div>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-left text-sm text-slate-600 dark:text-slate-400">
						<thead>
							<tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
								<th className="py-2">Email</th>
								<th className="py-2">Org Role</th>
								<th className="py-2">Teams</th>
							</tr>
						</thead>
						<tbody>
							{members.map((member) => (
								<tr
									key={member.uid}
									onClick={() => setSelectedMemberId(member.uid)}
									className={`cursor-pointer border-b border-slate-100 dark:border-slate-700 text-sm ${member.uid === selectedMemberId ? 'bg-slate-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
										}`}
								>
									<td className="py-2 text-slate-900 dark:text-white">{member.email || member.uid}</td>
									<td className="py-2">{member.role}</td>
									<td className="py-2">{memberTeamsMap[member.uid]?.length || 0}</td>
								</tr>
							))}
							{members.length === 0 && (
								<tr>
									<td colSpan={3} className="py-4 text-center text-slate-500">No members yet.</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none space-y-4">
				{selectedMember ? (
					<>
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Member</p>
							<h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{selectedMember.email || selectedMember.uid}</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400">Org role · {selectedMember.role}</p>
						</div>
						<div className="space-y-3">
							{(memberTeamsMap[selectedMember.uid] || []).map((team) => (
								<div key={team.teamId} className="rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-semibold text-slate-900 dark:text-white">{team.teamName}</p>
											<p className="text-xs text-slate-500 dark:text-slate-400">Team ID · {team.teamId}</p>
										</div>
										<div className="flex items-center gap-2">
											<select
												value={team.role}
												disabled={!admin}
												onChange={(e) => handleRoleChange(team.teamId, e.target.value)}
												className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold dark:text-white"
											>
												<option value="MANAGER">Manager</option>
												<option value="EMPLOYEE">Employee</option>
											</select>
											{admin && (
												<button
													onClick={() => handleRemove(team.teamId)}
													className="rounded-2xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
												>
													Remove
												</button>
											)}
										</div>
									</div>
								</div>
							))}
							{(memberTeamsMap[selectedMember.uid] || []).length === 0 && (
								<p className="text-sm text-slate-500">Not assigned to any team.</p>
							)}
						</div>

						{admin && (
							<form onSubmit={handleAssign} className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-3">
								<h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Assign to team</h3>
								<select
									value={assignTeamId}
									onChange={(e) => setAssignTeamId(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
								>
									<option value="">Select a team</option>
									{availableTeams.map((team) => (
										<option key={team.teamId} value={team.teamId}>{team.teamName}</option>
									))}
								</select>
								<select
									value={assignRole}
									onChange={(e) => setAssignRole(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
								>
									<option value="EMPLOYEE">Employee</option>
									<option value="MANAGER">Manager</option>
								</select>
								<button type="submit" className="w-full rounded-2xl bg-slate-900 py-2 text-sm font-semibold text-white">
									Assign to Team
								</button>
							</form>
						)}
					</>
				) : (
					<p className="text-sm text-slate-500">Select a member to view details.</p>
				)}

				{status && <p className="text-xs text-slate-500">{status}</p>}
			</div>
		</div>
	)
}

export default Members
