import { defineConfig } from 'vitest/config';

export default defineConfig({
	server: {
		sourcemapIgnoreList: (source) => source.includes('/node_modules/'),
	},
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
