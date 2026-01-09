export const getPreferredDashboardPath = (context) => {
	if (!userHasOrg(context)) return '/get-started'
	return '/dashboard/overview'
}

export const userHasOrg = (context) => Boolean(context && context.orgId)

export const isAdmin = (context) => (context?.orgRole || '').toUpperCase() === 'ORG_ADMIN'

export const isManager = (context) => (context?.teams || []).some((team) => (team.role || '').toUpperCase() === 'MANAGER')

export const getUserTier = (context) => {
	if (isAdmin(context)) return 'ADMIN'
	if (isManager(context)) return 'MANAGER'
	return 'EMPLOYEE'
}
