import { create } from 'zustand'

const useThemeStore = create((set) => ({
  theme: localStorage.getItem('theme') || 'light',
  toggleTheme: () => {
    const currentTheme = localStorage.getItem('theme') || 'light'
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'

    localStorage.setItem('theme', newTheme)

    // Direct DOM manipulation guarantees immediate visual feedback
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Update state
    set({ theme: newTheme })
  },
  initTheme: () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      set({ theme: savedTheme })
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        set({ theme: 'dark' })
        document.documentElement.classList.add('dark')
      }
    }
  },
}))

export default useThemeStore
