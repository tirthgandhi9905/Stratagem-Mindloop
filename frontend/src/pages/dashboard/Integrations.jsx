import { useState, useEffect } from 'react'
import useUserContext from '../../hooks/useUserContext'
import {
  getIntegrations,
  addGitHubRepository,
  deleteGitHubRepository,
  setDefaultGitHubRepository
} from '../../services/integrationsApi'
import { isAdmin } from '../../utils/dashboardRoutes'

const Integrations = () => {
  const { context } = useUserContext()
  const orgName = context?.organization?.name || 'Your organization'
  const userIsAdmin = isAdmin(context)

  const [integrations, setIntegrations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // GitHub form state
  const [isAddingRepo, setIsAddingRepo] = useState(false)
  const [repoName, setRepoName] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deletingRepoId, setDeletingRepoId] = useState(null)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getIntegrations()
      setIntegrations(data)
    } catch (err) {
      console.error('Failed to load integrations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRepository = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      await addGitHubRepository(
        repoName.trim(),
        githubRepo.trim(),
        githubToken || null,
        isDefault
      )
      setSaveSuccess(true)
      setIsAddingRepo(false)

      // Reset form
      setRepoName('')
      setGithubRepo('')
      setGithubToken('')
      setIsDefault(false)

      // Reload integrations to get updated data
      await loadIntegrations()

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to add GitHub repository:', err)
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRepository = async (repoId) => {
    if (!confirm('Are you sure you want to delete this repository?')) {
      return
    }

    setDeletingRepoId(repoId)
    try {
      await deleteGitHubRepository(repoId)
      setSaveSuccess(true)
      await loadIntegrations()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to delete repository:', err)
      setSaveError(err.message)
      setTimeout(() => setSaveError(null), 3000)
    } finally {
      setDeletingRepoId(null)
    }
  }

  const handleSetDefaultRepository = async (repoId) => {
    try {
      await setDefaultGitHubRepository(repoId)
      setSaveSuccess(true)
      await loadIntegrations()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to set default repository:', err)
      setSaveError(err.message)
      setTimeout(() => setSaveError(null), 3000)
    }
  }

  const handleCancelAdd = () => {
    setIsAddingRepo(false)
    setSaveError(null)
    setRepoName('')
    setGithubRepo('')
    setGithubToken('')
    setIsDefault(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-slate-500 dark:text-slate-400">Loading integrations...</p>
        </div>
      </div>
    )
  }

  const githubRepositories = integrations?.github?.repositories || []
  const hasRepositories = githubRepositories.length > 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Integrations</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Slack & GitHub Configuration</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Manage external integrations for {orgName}</p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">✓ GitHub integration updated successfully!</p>
          </div>
        )}

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Slack Integration Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-lg dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Slack</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Slash commands are live.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {integrations?.slack ? 'Connected' : 'Ready'}
              </span>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">Workspace</label>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use <code className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-1 font-mono text-xs">/assign</code> command in Slack</p>
            </div>
          </div>

          {/* GitHub Integration Card - Summary */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-lg dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">GitHub</p>
                <p className="text-xs text-slate-500">
                  {hasRepositories ? `${githubRepositories.length} repository${githubRepositories.length === 1 ? '' : 'ies'} configured` : 'Not configured'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasRepositories
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                {hasRepositories ? 'Connected' : 'Pending'}
              </span>
            </div>

            <div className="mt-4">
              {userIsAdmin && (
                <button
                  onClick={() => setIsAddingRepo(true)}
                  className="w-full rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-blue-500"
                >
                  Add Repository
                </button>
              )}

              {!userIsAdmin && (
                <p className="text-xs text-slate-500 italic">Only admins can manage repositories</p>
              )}
            </div>
          </div>
        </div>

        {/* Add Repository Form */}
        {isAddingRepo && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-lg dark:shadow-none">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add GitHub Repository</h2>
            <form onSubmit={handleAddRepository} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Repository Name *
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g., Frontend App, Backend API"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  A friendly name to identify this repository
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  GitHub Repository *
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="Paste GitHub URL or enter owner/repo"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Paste full URL (https://github.com/owner/repo) or enter owner/repo
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Personal Access Token (optional)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx (for private repos)"
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Required only for private repositories</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-blue-500 focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 bg-white dark:bg-slate-700"
                />
                <label htmlFor="isDefault" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  Set as default repository
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !repoName || !githubRepo}
                  className="flex-1 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600"
                >
                  {saving ? 'Adding...' : 'Add Repository'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of Repositories */}
        {hasRepositories && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-lg dark:shadow-none">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Configured Repositories</h2>
            <div className="space-y-3">
              {githubRepositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-200">{repo.name}</p>
                      {repo.isDefault && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Default
                        </span>
                      )}
                    </div>
                    <a
                      href={`https://github.com/${repo.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {repo.repo}
                    </a>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Added by {repo.addedBy || 'Unknown'}
                    </p>
                  </div>

                  {userIsAdmin && (
                    <div className="flex gap-2">
                      {!repo.isDefault && (
                        <button
                          onClick={() => handleSetDefaultRepository(repo.id)}
                          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRepository(repo.id)}
                        disabled={deletingRepoId === repo.id}
                        className="rounded-lg border border-red-300 dark:border-red-900 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {deletingRepoId === repo.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How It Works</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <strong className="text-slate-900 dark:text-white">GitHub Setup:</strong> Add multiple repositories for different teams or projects. Paste your repository URL (e.g., <code className="rounded bg-slate-100 dark:bg-slate-900 px-2 py-1 font-mono text-xs">https://github.com/owner/repo</code>) or enter <code className="rounded bg-slate-100 dark:bg-slate-900 px-2 py-1 font-mono text-xs">owner/repo</code>. For private repos, add a Personal Access Token from <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub Settings</a>.
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Multiple Repositories:</strong> When creating tasks, you can select which repository to create GitHub issues in. The default repository is used when no specific repository is selected.
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Slack:</strong> Use the <code className="rounded bg-slate-100 dark:bg-slate-900 px-2 py-1 font-mono text-xs">/assign</code> command to create tasks from Slack. Example: <code className="rounded bg-slate-100 dark:bg-slate-900 px-2 py-1 font-mono text-xs">/assign user@example.com Fix the login bug priority=high</code>
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">GitHub Issues:</strong> When you create a task with GitHub integration enabled, an issue will be automatically created in your selected repository. The issue URL will be linked to the task.
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Meeting Intelligence:</strong> Action items detected during Google Meet sessions will create tasks and GitHub issues automatically (with manager approval).
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}

export default Integrations
