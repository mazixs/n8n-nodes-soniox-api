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

	it('accepts string models, item wrappers and removes duplicates', () => {
		expect(
			normalizeModelOptions([
				' stt-async-v5 ',
				'stt-async-v5',
				{ value: 'stt-async-v4', displayName: 'Async v4' },
				{ name: 'stt-async-v3' },
			]),
		).toEqual([
			{ name: 'stt-async-v5', value: 'stt-async-v5' },
			{ name: 'Async v4', value: 'stt-async-v4' },
			{ name: 'stt-async-v3', value: 'stt-async-v3' },
		]);
		expect(
			normalizeModelOptions({ items: [{ model_id: 'model-1', name: 'Model 1' }] }),
		).toEqual([{ name: 'Model 1', value: 'model-1' }]);
	});

	it('returns an empty list for malformed model responses', () => {
		expect(normalizeModelOptions(null)).toEqual([]);
		expect(normalizeModelOptions({ models: 'not-an-array' })).toEqual([]);
		expect(normalizeModelOptions([{ id: '' }, { value: '  ' }])).toEqual([]);
	});
});
