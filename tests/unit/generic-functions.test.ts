import { describe, expect, it, vi } from 'vitest';
import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import {
	sonioxApiRequest,
	sonioxApiRequestAllItems,
} from '../../nodes/Soniox/GenericFunctions';

function createContext(responses: unknown[]): {
	context: IExecuteFunctions;
	requests: IHttpRequestOptions[];
} {
	const requests: IHttpRequestOptions[] = [];
	const request = vi.fn(
		async (_credentialType: string, options: IHttpRequestOptions) => {
			requests.push(options);
			return responses.shift() ?? {};
		},
	);

	const context = {
		getCredentials: vi.fn(async () => ({
			apiUrl: 'https://api.soniox.com/v1',
		})),
		helpers: {
			httpRequestWithAuthentication: request,
		},
		getNode: vi.fn(() => ({})),
	} as unknown as IExecuteFunctions;

	return { context, requests };
}

describe('Soniox n8n request integration', () => {
	it('uses the modern authenticated HTTP helper', async () => {
		const { context, requests } = createContext([{ id: 'file_123' }]);

		const response = await sonioxApiRequest.call(
			context,
			'GET',
			'/files/file_123',
			{},
			{ include: 'metadata' },
		);

		expect(response).toEqual({ id: 'file_123' });
		expect(requests[0]).toMatchObject({
			method: 'GET',
			url: 'https://api.soniox.com/v1/files/file_123',
			qs: { include: 'metadata' },
		});
	});

	it('keeps caller query parameters unchanged while paginating', async () => {
		const query = { status: 'completed' };
		const { context, requests } = createContext([
			{ transcriptions: [{ id: 'tr_1' }], next_page_cursor: 'cursor_2' },
			{ transcriptions: [{ id: 'tr_2' }] },
		]);

		const response = await sonioxApiRequestAllItems.call(
			context,
			'GET',
			'/transcriptions',
			{},
			query,
		);

		expect(response).toEqual([{ id: 'tr_1' }, { id: 'tr_2' }]);
		expect(query).toEqual({ status: 'completed' });
		expect(requests[0].qs).toEqual({ status: 'completed', limit: 100 });
		expect(requests[1].qs).toEqual({
			status: 'completed',
			limit: 100,
			cursor: 'cursor_2',
		});
	});
});
