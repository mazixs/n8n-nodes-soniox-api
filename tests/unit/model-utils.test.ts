import { describe, expect, it } from 'vitest';
import {
	filterAsyncModels,
	getDefaultAsyncModel,
	normalizeModelOptions,
} from '../../nodes/Soniox/modelUtils';

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

	it('uses the current async model as fallback', () => {
		expect(getDefaultAsyncModel([])).toBe('stt-async-v5');
		expect(
			getDefaultAsyncModel([{ name: 'Async v4', value: 'stt-async-v4' }]),
		).toBe('stt-async-v4');
	});
});
