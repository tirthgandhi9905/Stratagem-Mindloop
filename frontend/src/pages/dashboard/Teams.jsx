import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isAdmin, isManager } from '../../utils/dashboardRoutes'
import {
	createTeam,
	deleteTeam,
	addMemberToTeam,
	updateTeamMemberRole,
	removeTeamMember,
} from '../../services/teamApi'

const Teams = () => {
	const { context, refreshContext } = useOutletContext()
	const admin = isAdmin(context)
	const manager = isManager(context)
	const accessibleTeamIds = useMemo(() => {
		if (admin) return (context.orgTeams || []).map((team) => team.teamId)
		return (context.teams || []).map((team) => team.teamId)
	}, [admin, context])

	const teams = useMemo(() => {
		const allTeams = context.orgTeams || []
		return admin ? allTeams : allTeams.filter((team) => accessibleTeamIds.includes(team.teamId))
	}, [context, admin, accessibleTeamIds])

	const [selectedTeamId, setSelectedTeamId] = useState(() => teams[0]?.teamId || null)
	useEffect(() => {
		if (teams.length > 0 && !teams.find((team) => team.teamId === selectedTeamId)) {
			setSelectedTeamId(teams[0].teamId)
		}
	}, [teams, selectedTeamId])

	const selectedTeam = useMemo(() => teams.find((team) => team.teamId === selectedTeamId) || null, [teams, selectedTeamId])

	const [newTeamName, setNewTeamName] = useState('')
	const [newTeamDescription, setNewTeamDescription] = useState('')
	const [assignUser, setAssignUser] = useState('')
	const [assignRole, setAssignRole] = useState('EMPLOYEE')
	const [status, setStatus] = useState('')

	const teamMembers = selectedTeam?.members || []
	const teamMemberIds = teamMembers.map((member) => member.uid)
	const availableMembers = (context.orgMembers || []).filter((member) => !teamMemberIds.includes(member.uid))

	const handleCreateTeam = async (e) => {
		e.preventDefault()
		if (!admin) return
		if (!newTeamName.trim()) {
			setStatus('Provide a team name')
			return
		}
		try {
			setStatus('Creating team…')
			await createTeam({ name: newTeamName.trim(), description: newTeamDescription.trim() })
			setNewTeamName('')
			setNewTeamDescription('')
			await refreshContext()
			setStatus('Team created')
		} catch (err) {
			setStatus(err.message || 'Failed to create team')
		}
	}

	const handleAssignMember = async (e) => {
		e.preventDefault()
		if (!admin || !selectedTeam) return
		if (!assignUser) {
			setStatus('Select a teammate first')
			return
		}
		try {
			setStatus('Adding member…')
			await addMemberToTeam(selectedTeam.teamId, { userId: assignUser, role: assignRole })
			setAssignUser('')
			setAssignRole('EMPLOYEE')
			await refreshContext()
			setStatus('Member added')
		} catch (err) {
			setStatus(err.message || 'Failed to add member')
		}
	}

	const handleRoleChange = async (memberUid, role) => {
		if (!admin || !selectedTeam) return
		try {
			setStatus('Updating role…')
			await updateTeamMemberRole(selectedTeam.teamId, memberUid, role)
			await refreshContext()
			setStatus('Role updated')
		} catch (err) {
			setStatus(err.message || 'Failed to update role')
		}
	}

	const handleRemoveMember = async (memberUid) => {
		if (!admin || !selectedTeam) return
		try {
			setStatus('Removing member…')
			await removeTeamMember(selectedTeam.teamId, memberUid)
			await refreshContext()
			setStatus('Member removed')
		} catch (err) {
			setStatus(err.message || 'Failed to remove member')
		}
	}

	const handleDeleteTeam = async (teamId) => {
		if (!admin || !teamId) return
		const teamToDelete = teams.find((t) => t.teamId === teamId)
		if (!teamToDelete) return
		const confirmed = window.confirm(`Are you sure you want to delete "${teamToDelete.teamName}"? This will remove all members and cannot be undone.`)
		if (!confirmed) return
		try {
			setStatus('Deleting team…')
			await deleteTeam(teamId)
			await refreshContext()
			setStatus('Team deleted')
			if (selectedTeamId === teamId) {
				setSelectedTeamId(teams[0]?.teamId || null)
			}
		} catch (err) {
			setStatus(err.message || 'Failed to delete team')
		}
	}

	return (
		<div className="grid gap-8 lg:grid-cols-[280px_1fr]">
			<div className="space-y-6">
				<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-5 shadow-lg dark:shadow-none">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Teams</h2>
						<span className="text-xs text-slate-400 dark:text-slate-500">{teams.length}</span>
					</div>
					<ul className="mt-4 space-y-2">
						{teams.map((team) => (
							<li key={team.teamId}>
								<button
									onClick={() => setSelectedTeamId(team.teamId)}
									className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${selectedTeamId === team.teamId ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
										}`}
								>
									{team.teamName}
									<span className="block text-xs font-normal text-slate-400 dark:text-slate-500">{team.members?.length || 0} members</span>
								</button>
							</li>
						))}
						{teams.length === 0 && <li className="text-sm text-slate-500">No teams available.</li>}
					</ul>
				</div>
				{admin && (
					<form onSubmit={handleCreateTeam} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-5 shadow-lg dark:shadow-none space-y-3">
						<h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Create team</h3>
						<input
							type="text"
							value={newTeamName}
							onChange={(e) => setNewTeamName(e.target.value)}
							placeholder="Team name"
							className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm dark:text-white"
						/>
						<textarea
							value={newTeamDescription}
							onChange={(e) => setNewTeamDescription(e.target.value)}
							placeholder="Description"
							className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm dark:text-white"
							rows={2}
						></textarea>
						<button type="submit" className="w-full rounded-2xl bg-slate-900 py-2 text-sm font-semibold text-white">
							Create Team
						</button>
					</form>
				)}
			</div>

			<div className="space-y-6">
				{selectedTeam ? (
					<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-xl dark:shadow-none space-y-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Team</p>
								<h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{selectedTeam.teamName}</h2>
							</div>
							<div className="flex items-center gap-3">
								<p className="text-sm text-slate-500 dark:text-slate-400">{teamMembers.length} members</p>
								{admin && (
									<button
										onClick={() => handleDeleteTeam(selectedTeam.teamId)}
										className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
									>
										Delete team
									</button>
								)}
							</div>
						</div>

						<div className="space-y-3">
							{teamMembers.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No members yet.</p>}
							{teamMembers.map((member) => (
								<div key={member.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3">
									<div>
										<p className="text-sm font-semibold text-slate-900 dark:text-white">{member.email || member.uid}</p>
										<p className="text-xs text-slate-500 dark:text-slate-400">{member.uid}</p>
									</div>
									<div className="flex items-center gap-2">
										<select
											value={member.role}
											disabled={!admin}
											onChange={(e) => handleRoleChange(member.uid, e.target.value)}
											className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold dark:text-white"
										>
											<option value="MANAGER">MANAGER</option>
											<option value="EMPLOYEE">EMPLOYEE</option>
										</select>
										{admin && (
											<button
												onClick={() => handleRemoveMember(member.uid)}
												className="rounded-2xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
											>
												Remove
											</button>
										)}
									</div>
								</div>
							))}
						</div>

						{admin && (
							<form onSubmit={handleAssignMember} className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-3">
								<h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Assign member</h3>
								<select
									value={assignUser}
									onChange={(e) => setAssignUser(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
								>
									<option value="">Select member</option>
									{availableMembers.map((member) => (
										<option key={member.uid} value={member.uid}>
											{member.email || member.uid}
										</option>
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
									Assign
								</button>
							</form>
						)}
					</div>
				) : (
					<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 text-sm text-slate-500 dark:text-slate-400 shadow-xl dark:shadow-none">
						Select a team to get started.
					</div>
				)}

				{status && <p className="text-sm text-slate-500">{status}</p>}
			</div>
		</div>
	)
}

export default Teams
