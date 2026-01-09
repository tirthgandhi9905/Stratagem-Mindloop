import { useEffect } from 'react'
import useAuthStore from '../store/authStore'
import useContextStore from '../store/contextStore'

const useUserContext = () => {
	const { user } = useAuthStore()
	const context = useContextStore((state) => state.context)
	const loading = useContextStore((state) => state.loading)
	const error = useContextStore((state) => state.error)
	const refreshContext = useContextStore((state) => state.refreshContext)
	const reset = useContextStore((state) => state.reset)

	useEffect(() => {
		if (!user) {
			reset()
			return
		}
		if (!context && !loading) {
			refreshContext()
		}
	}, [user, context, loading, refreshContext, reset])

	return { context, loading, error, refreshContext }
}

export default useUserContext
