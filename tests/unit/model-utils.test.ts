import { describe, expect, it } from 'vitest';
import { filterAsyncModels, normalizeModelOptions } from '../../nodes/Soniox/modelUtils';

describe('Soniox model utilities', () => {
	it('normalizes current and legacy model response shapes', () => {
		expect(
			normalizeModelOptions({
				models: [
					{ id: 'stt-async-v5', display_name: 'Async v5' },
					{ model_id: 'stt-async-v4' },
				],
			}),
		).toEqual([
			{ name: 'Async v5', value: 'stt-async-v5' },
			{ name: 'stt-async-v4', value: 'stt-async-v4' },
		]);
	});

	it('filters realtime models from the async selector', () => {
		const models = [
			{ name: 'Async v5', value: 'stt-async-v5' },
			{ name: 'Realtime v5', value: 'stt-rt-v5' },
			{ name: 'Legacy realtime', value: 'realtime-preview' },
		];

		expect(filterAsyncModels(models)).toEqual([models[0]]);
	});
});
