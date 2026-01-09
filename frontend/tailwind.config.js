/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./index.html', './src/**/*.{js,jsx}'],
	theme: {
		extend: {
			colors: {
				midnight: '#0f172a',
				accent: '#22d3ee',
			},
			backdropBlur: {
				glass: '18px',
			},
			borderRadius: {
				lg: '0.35rem',
				xl: '0.4rem',
				'2xl': '0.45rem',
				'3xl': '0.5rem',
			},
		},
	},
	plugins: [],
}
