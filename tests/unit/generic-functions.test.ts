import { describe, expect, it, vi } from 'vitest';
import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import * as workflow from 'n8n-workflow';
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

	it('falls back to the legacy authenticated helper and maps multipart options', async () => {
		const legacyRequest = vi.fn(async () => ({ id: 'file-legacy' }));
		const formData = new FormData();
		formData.append('file', new Blob(['audio']), 'audio.mp3');
		const context = {
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			helpers: { requestWithAuthentication: legacyRequest },
		} as unknown as IExecuteFunctions;

		await sonioxApiRequest.call(
			context,
			'POST',
			'/files',
			{},
			{},
			undefined,
			{ formData },
		);

		expect(legacyRequest).toHaveBeenCalledWith(
			'sonioxApi',
			expect.objectContaining({
				uri: 'https://api.soniox.com/v1/files',
				formData,
			}),
		);
		expect(legacyRequest.mock.calls[0][1]).not.toHaveProperty('body');
	});

	it('exposes structured API error details without retrying a client error', async () => {
		const request = vi.fn(async () => {
			throw {
				statusCode: 400,
				response: {
					body: {
						error_type: 'invalid_request',
						error_message: 'Invalid model',
						request_id: 'req-400',
						more_info: 'https://soniox.com/docs/errors',
						validation_errors: [{ field: 'model' }],
					},
				},
			};
		});
		const context = {
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			helpers: { httpRequestWithAuthentication: request },
			getNode: vi.fn(() => ({ name: 'Soniox' })),
		} as unknown as IExecuteFunctions;

		await expect(
			sonioxApiRequest.call(context, 'GET', '/models'),
		).rejects.toMatchObject({
			httpCode: '400',
			errorResponse: expect.objectContaining({
				error_type: 'invalid_request',
				error_message: 'Invalid model',
				request_id: 'req-400',
				validation_errors: [{ field: 'model' }],
			}),
		});
		expect(request).toHaveBeenCalledOnce();
	});

	it('supports array pagination responses and custom item keys', async () => {
		const { context, requests } = createContext([[{ id: 'one' }]]);
		const arrayResponse = await sonioxApiRequestAllItems.call(
			context,
			'GET',
			'/models',
		);
		expect(arrayResponse).toEqual([]);
		expect(requests[0].qs).toEqual({ limit: 100 });

		const custom = createContext([
			{ records: [{ id: 'one' }], next_page_cursor: '' },
		]);
		const customResponse = await sonioxApiRequestAllItems.call(
			custom.context,
			'GET',
			'/custom',
			{},
			{},
			'records',
		);
		expect(customResponse).toEqual([{ id: 'one' }]);
	});

	it('retries transient API failures and uses the successful response', async () => {
		const sleep = vi.spyOn(workflow, 'sleep').mockResolvedValue(undefined);
		const request = vi
			.fn()
			.mockRejectedValueOnce({ statusCode: 503 })
			.mockResolvedValueOnce({ id: 'recovered' });
		const context = {
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			helpers: { httpRequestWithAuthentication: request },
		} as unknown as IExecuteFunctions;

		await expect(sonioxApiRequest.call(context, 'GET', '/health')).resolves.toEqual({
			id: 'recovered',
		});
		expect(request).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledWith(1_000);
		sleep.mockRestore();
	});
});
