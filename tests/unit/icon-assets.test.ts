import { describe, expect, it } from 'vitest';

import lightIcon from '../../nodes/Soniox/soniox.svg?raw';
import darkIcon from '../../nodes/Soniox/soniox-dark.svg?raw';

function readViewBox(svg: string): [number, number, number, number] {
	const match = svg.match(/viewBox="([^"]+)"/);
	expect(match?.[1]).toBeDefined();

	return match![1].split(/\s+/).map(Number) as [number, number, number, number];
}

describe('Soniox node icon assets', () => {
	it('uses a square SVG canvas so the mark remains visible in n8n', () => {
		for (const [filename, icon] of [
			['soniox.svg', lightIcon],
			['soniox-dark.svg', darkIcon],
		] as const) {
			const [, , width, height] = readViewBox(icon);

			expect(width, `${filename} width`).toBe(height);
		}
	});

	it('uses contrasting colors for the light and dark themes', () => {
		expect(lightIcon).toContain('fill="#111827"');
		expect(lightIcon).not.toContain('fill="#FFFFFF"');
		expect(darkIcon).toContain('fill="#FFFFFF"');
		expect(darkIcon).not.toContain('fill="#111827"');
	});
});
