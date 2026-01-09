import { create } from 'zustand'
import {
	signInWithEmail,
	signInWithGoogle,
	signOutUser,
	signUpWithEmail,
	updateDisplayName,
	subscribeToAuthChanges,
} from '../services/auth'

const formatUser = (payload) => ({
	uid: payload.uid,
	name: payload.name || payload.email,
	email: payload.email,
	picture: payload.picture || '',
})

const useAuthStore = create((set, get) => ({
	user: null,
	idToken: null,
	loading: true, // Start loading to wait for Firebase
	error: null,
	initializeSubscription: () => {
		const unsubscribe = subscribeToAuthChanges((userData) => {
			if (userData) {
				set({
					user: formatUser(userData),
					idToken: userData.idToken,
					loading: false,
					error: null,
				})
			} else {
				set({
					user: null,
					idToken: null,
					loading: false,
					error: null,
				})
			}
		})
		return unsubscribe
	},
	loginWithGoogle: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithGoogle()
			// State will be updated by subscription, but we can set it here too for immediate feedback if needed
			// But relying on subscription is safer for consistency. 
			// However, signInWithGoogle returns data, so let's keep it but maybe rely on listener?
			// Firebase listener fires immediately after sign in.
			// Let's rely on standard flow.
			// Actually, just let the function handle errors, success update comes from listener usually soon.
			// But for now, let's keep existing logic but realize listener will also fire.
			// To avoid double updates, we can just let listener handle it, OR keep as is.
			// The listener is the source of truth.
			// If I keep set() here, it might cause a double render, but it's fine.
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			set({ error: err.message || 'Login failed', loading: false })
		}
	},
	signInWithEmail: async (email, password) => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signInWithEmail({ email: email.trim(), password })
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			set({ error: err.message || 'Login failed', loading: false })
		}
	},
	signUpWithEmail: async ({ name, email, password }) => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			const userData = await signUpWithEmail({ name: name.trim(), email: email.trim(), password })
			set({
				user: formatUser(userData),
				idToken: userData.idToken,
				loading: false,
				error: null,
			})
		} catch (err) {
			set({ error: err.message || 'Sign-up failed', loading: false })
		}
	},
	logout: async () => {
		if (get().loading) return
		set({ loading: true, error: null })
		try {
			await signOutUser()
			// Listener will set user to null
		} catch (err) {
			set({ error: err.message || 'Logout failed', loading: false })
		}
	},
	updateProfileName: async (name) => {
		if (!name || !name.trim()) {
			set({ error: 'Name is required' })
			return
		}
		set({ loading: true, error: null })
		try {
			const updated = await updateDisplayName(name.trim())
			set((state) => ({
				user: state.user
					? {
						...state.user,
						name: updated.name,
					}
					: {
						name: updated.name,
						email: updated.email,
						picture: updated.picture,
						uid: updated.uid,
					},
				loading: false,
			}))
		} catch (err) {
			set({ error: err.message || 'Failed to update profile', loading: false })
		}
	},
}))

export default useAuthStore
