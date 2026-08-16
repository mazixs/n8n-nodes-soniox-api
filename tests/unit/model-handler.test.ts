import { describe, expect, it, vi } from 'vitest';
import { IExecuteFunctions } from 'n8n-workflow';
import { modelHandler } from '../../nodes/Soniox/handlers/ModelHandler';

function createContext(response: unknown) {
	const request = vi.fn(async () => response);
	return {
		context: {
			getNode: vi.fn(() => ({ name: 'Soniox' })),
			getCredentials: vi.fn(async () => ({ apiUrl: 'https://api.soniox.com/v1' })),
			helpers: { httpRequestWithAuthentication: request },
		} as unknown as IExecuteFunctions,
		request,
	};
}

describe('Soniox model handler', () => {
	it('returns object models and ignores malformed entries', async () => {
		const { context, request } = createContext({
			models: [{ id: 'stt-async-v5' }, null, 'invalid'],
		});
		const result = await modelHandler.call(context, 'getAll', 0);

		expect(result).toEqual([
			{ json: { id: 'stt-async-v5' }, pairedItem: { item: 0 } },
		]);
		expect(request).toHaveBeenCalledOnce();
	});

	it('supports array responses and returns no data for unknown operations', async () => {
		const { context } = createContext([{ id: 'model-1' }, { name: 'model-2' }]);
		const result = await modelHandler.call(context, 'getAll', 2);
		expect(result.map(({ json }) => json)).toEqual([
			{ id: 'model-1' },
			{ name: 'model-2' },
		]);

		const empty = await modelHandler.call(context, 'unsupported', 0);
		expect(empty).toEqual([]);
	});
});
