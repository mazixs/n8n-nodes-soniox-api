import { defineConfig } from 'vitest/config';

export default defineConfig({
	// n8n's published packages omit the source files referenced by their sourcemaps.
	// Keep Vite's test output focused on actionable project errors.
	logLevel: 'error',
	server: {
		sourcemapIgnoreList: (source) => source.includes('/node_modules/'),
	},
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
