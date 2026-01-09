import { auth } from '../config/firebase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000'

/**
 * Get organization integrations (GitHub, Slack, etc.)
 */
export async function getIntegrations() {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}

	const token = await user.getIdToken()
	const response = await fetch(`${API_BASE_URL}/org/integrations`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to fetch integrations' }))
		throw new Error(error.detail || 'Failed to fetch integrations')
	}

	return response.json()
}

/**
 * Update GitHub integration for organization (legacy - kept for backward compatibility)
 * @param {string} githubRepo - GitHub repository in format "owner/repo"
 * @param {string} githubToken - Optional GitHub personal access token
 */
export async function updateGitHubIntegration(githubRepo, githubToken = null) {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}

	const token = await user.getIdToken()
	const payload = { githubRepo }
	
	if (githubToken) {
		payload.githubToken = githubToken
	}

	const response = await fetch(`${API_BASE_URL}/org/integrations/github`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to update GitHub integration' }))
		throw new Error(error.detail || 'Failed to update GitHub integration')
	}

	return response.json()
}

/**
 * Add a new GitHub repository to the organization
 * @param {string} name - Display name for the repository
 * @param {string} githubRepo - GitHub repository in format "owner/repo"
 * @param {string} githubToken - Optional GitHub personal access token
 * @param {boolean} isDefault - Set as default repository
 */
export async function addGitHubRepository(name, githubRepo, githubToken = null, isDefault = false) {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}

	const token = await user.getIdToken()
	const payload = { 
		name,
		githubRepo,
		isDefault
	}
	
	if (githubToken) {
		payload.githubToken = githubToken
	}

	const response = await fetch(`${API_BASE_URL}/org/integrations/github/add`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to add GitHub repository' }))
		throw new Error(error.detail || 'Failed to add GitHub repository')
	}

	return response.json()
}

/**
 * Delete a GitHub repository from the organization
 * @param {string} repoId - Repository ID to delete
 */
export async function deleteGitHubRepository(repoId) {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}

	const token = await user.getIdToken()

	const response = await fetch(`${API_BASE_URL}/org/integrations/github/${repoId}`, {
		method: 'DELETE',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to delete GitHub repository' }))
		throw new Error(error.detail || 'Failed to delete GitHub repository')
	}

	return response.json()
}

/**
 * Set a repository as the default for the organization
 * @param {string} repoId - Repository ID to set as default
 */
export async function setDefaultGitHubRepository(repoId) {
	const user = auth.currentUser
	if (!user) {
		throw new Error('User not authenticated')
	}

	const token = await user.getIdToken()

	const response = await fetch(`${API_BASE_URL}/org/integrations/github/set-default`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ repoId }),
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to set default repository' }))
		throw new Error(error.detail || 'Failed to set default repository')
	}

	return response.json()
}

