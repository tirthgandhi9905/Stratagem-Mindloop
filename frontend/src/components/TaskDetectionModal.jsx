const TaskDetectionModal = ({ task, status, onApprove, onReject, onCloseStatus }) => {
	if (!task && !status) return null

	const renderStatus = () => {
		if (!status) return null
		const tone = status.state === 'error' ? 'text-rose-700 bg-rose-50 border-rose-200' : status.state === 'success' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-700 bg-slate-50 border-slate-200'
		return (
			<div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${tone}`}>
				<div className="flex items-center justify-between">
					<span>{status.message}</span>
					<button onClick={onCloseStatus} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Dismiss</button>
				</div>
			</div>
		)
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
			<div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
				<p className="text-xs uppercase tracking-[0.35em] text-slate-500">Meeting AI</p>
				<h2 className="mt-1 text-2xl font-semibold text-slate-900">Detected task needs approval</h2>

				{task && (
					<div className="mt-4 space-y-2">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
							<p className="text-base font-semibold text-slate-900">{task.title}</p>
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</p>
							<p className="text-sm text-slate-700">{task.assignedToEmail}</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">Priority: {task.priority}</span>
							<span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Source: {task.source}</span>
						</div>
						<p className="text-sm text-slate-700">{task.description}</p>
					</div>
				)}

				<div className="mt-6 flex flex-wrap gap-3">
					<button onClick={onApprove} disabled={!task || status?.state === 'working'} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70">{status?.state === 'working' ? 'Syncing…' : 'Approve & sync'}</button>
					<button onClick={onReject} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400">Reject</button>
				</div>

				{renderStatus()}
			</div>
		</div>
	)
}

export default TaskDetectionModal
