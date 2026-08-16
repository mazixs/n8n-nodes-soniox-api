import { describe, expect, it, vi } from 'vitest';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import * as workflow from 'n8n-workflow';
import { Soniox } from '../../nodes/Soniox/Soniox.node';

describe('Soniox node error execution', () => {
	it('returns the same safe diagnostics through Continue On Fail', async () => {
		const sleep = vi.spyOn(workflow, 'sleep').mockResolvedValue(undefined);
		const context = {
			getInputData: vi.fn(() => [{ json: {} }]),
			getNodeParameter: vi.fn((name: string) =>
				({
					resource: 'transcription',
					operation: 'getTranscript',
					transcriptionId: 'tr-123',
				}[name]),
			),
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			getNode: vi.fn(() => ({ name: 'Soniox' })),
			continueOnFail: vi.fn(() => true),
			helpers: {
				httpRequestWithAuthentication: vi.fn(async () => {
					throw {
						statusCode: 429,
						response: {
							body: {
								error_type: 'limit_exceeded',
								error_message: 'Quota exceeded',
								request_id: 'req-123',
							},
							headers: {
								'retry-after': '30',
								authorization: 'Bearer secret',
							},
						},
					};
				}),
			},
		} as unknown as IExecuteFunctions;

		const result = await Soniox.prototype.execute.call(context);
		const output = result[0][0].json;

		expect(output).toMatchObject({
			error: 'Quota exceeded',
			errorType: 'limit_exceeded',
			statusCode: 429,
			requestId: 'req-123',
			retryAfter: '30',
			retryable: true,
			resource: 'transcription',
			operation: 'getTranscript',
			itemIndex: 0,
		});
		expect(JSON.stringify(output)).not.toContain('secret');
		sleep.mockRestore();
	});

	it('uses the model loader and filters realtime models from async choices', async () => {
		const request = vi.fn(async () => ({
			models: [
				{ id: 'stt-async-v5', display_name: 'Async v5' },
				{ id: 'stt-rt-v5', display_name: 'Realtime v5' },
			],
		}));
		const context = {
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			helpers: { httpRequestWithAuthentication: request },
		} as unknown as ILoadOptionsFunctions;

		const options = await new Soniox().methods.loadOptions.getModels.call(
			context,
		);

		expect(options).toEqual([
			{ name: 'Async v5', value: 'stt-async-v5', description: 'Async v5' },
		]);
	});

	it('falls back to known async models when the model request fails', async () => {
		const context = {
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			helpers: {
				httpRequestWithAuthentication: vi.fn(async () => {
					throw new Error('network unavailable');
				}),
			},
		} as unknown as ILoadOptionsFunctions;

		const options = await new Soniox().methods.loadOptions.getModels.call(
			context,
		);

		expect(options.map(({ value }) => value)).toEqual([
			'stt-async-v5',
			'stt-async-v4',
			'stt-async-v3',
		]);
	});

	it('throws structured diagnostics when Continue On Fail is disabled', async () => {
		const context = {
			getInputData: vi.fn(() => [{ json: {} }]),
			getNodeParameter: vi.fn((name: string) =>
				({
					resource: 'transcription',
					operation: 'getTranscript',
					transcriptionId: '',
				}[name]),
			),
			getNode: vi.fn(() => ({ name: 'Soniox' })),
			continueOnFail: vi.fn(() => false),
		} as unknown as IExecuteFunctions;

		await expect(Soniox.prototype.execute.call(context)).rejects.toThrow(
			/Transcription ID is required/i,
		);
	});

	it('preserves a thrown API error when Continue On Fail is disabled', async () => {
		const context = {
			getInputData: vi.fn(() => [{ json: {} }]),
			getNodeParameter: vi.fn((name: string) =>
				({ resource: 'file', operation: 'get', fileId: 'file-1' }[name]),
			),
			getCredentials: vi.fn(async () => ({
				apiUrl: 'https://api.soniox.com/v1',
			})),
			getNode: vi.fn(() => ({ name: 'Soniox' })),
			continueOnFail: vi.fn(() => false),
			helpers: {
				httpRequestWithAuthentication: vi.fn(async () => {
					throw { statusCode: 400, body: { error_message: 'Bad file' } };
				}),
			},
		} as unknown as IExecuteFunctions;

		await expect(Soniox.prototype.execute.call(context)).rejects.toThrow(/Bad file/i);
	});

	it('wraps an unexpected loader error as a node operation error', async () => {
		const context = {
			getInputData: vi.fn(() => [{ json: {} }]),
			getNodeParameter: vi.fn((name: string) =>
				({ resource: 'model', operation: 'getAll' }[name]),
			),
			getCredentials: vi.fn(async () => {
				throw new Error('credential lookup failed');
			}),
			getNode: vi.fn(() => ({ name: 'Soniox' })),
			continueOnFail: vi.fn(() => false),
			helpers: {},
		} as unknown as IExecuteFunctions;

		await expect(Soniox.prototype.execute.call(context)).rejects.toThrow(
			/credential lookup failed/i,
		);
	});
});
