import { create } from 'zustand'
import { fetchUserContext } from '../services/userContextApi'

const useContextStore = create((set, get) => ({
	context: null,
	loading: false,
	error: null,
	refreshContext: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const data = await fetchUserContext()
			set({ context: data, loading: false, error: null })
		} catch (err) {
			set({ error: err.message || 'Failed to load context', loading: false, context: null })
		}
	},
	reset: () => set({ context: null, loading: false, error: null }),
}))

export default useContextStore
