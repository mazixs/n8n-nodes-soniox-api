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
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			include: ['nodes/Soniox/**/*.ts'],
			exclude: ['nodes/Soniox/**/*.d.ts'],
			thresholds: {
				statements: 90,
				branches: 85,
				functions: 95,
				lines: 90,
			},
		},
	},
});
