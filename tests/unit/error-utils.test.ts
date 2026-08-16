import { describe, expect, it } from 'vitest';
import { buildErrorData } from '../../nodes/Soniox/errorUtils';

describe('Soniox error output', () => {
	it('keeps legacy fields and adds safe structured quota diagnostics', () => {
		const data = buildErrorData(
			{
				statusCode: 429,
				response: {
					body: {
						error_type: 'limit_exceeded',
						error_message: 'Too many pending transcriptions',
						request_id: 'req_123',
						more_info: 'https://soniox.com/docs/api-reference/errors',
					},
					headers: {
						'retry-after': '60',
						authorization: 'Bearer secret-token',
					},
				},
				description: 'Error type: limit_exceeded\nRequest ID: req_123',
			},
			{
				resource: 'transcription',
				operation: 'createJob',
				itemIndex: 0,
			},
		);

		expect(data).toMatchObject({
			error: 'Too many pending transcriptions',
			errorType: 'limit_exceeded',
			statusCode: 429,
			requestId: 'req_123',
			moreInfo: 'https://soniox.com/docs/api-reference/errors',
			retryAfter: '60',
			retryable: true,
			resource: 'transcription',
			operation: 'createJob',
			itemIndex: 0,
		});
		expect(data.details).toEqual(
		expect.stringContaining('errorType: limit_exceeded'),
	);
		expect(data).not.toHaveProperty('headers');
		expect(JSON.stringify(data)).not.toContain('secret-token');
	});

	it('marks transient errors as retryable without exposing the response', () => {
		const data = buildErrorData(
			{
				statusCode: 503,
				response: {
					body: { error_message: 'Service unavailable' },
					headers: { 'retry-after': '3' },
				},
			},
			{ resource: 'file', operation: 'upload', itemIndex: 2 },
		);

		expect(data).toMatchObject({
			error: 'Service unavailable',
			statusCode: 503,
			retryAfter: '3',
			retryable: true,
			resource: 'file',
			operation: 'upload',
			itemIndex: 2,
		});
		expect(data).not.toHaveProperty('response');
	});

	it('keeps validation field diagnostics without reflected values', () => {
		const data = buildErrorData({
			statusCode: 400,
			response: {
				body: {
					error_message: 'Invalid request',
					validation_errors: [
						{ field: 'model', message: 'Unsupported model', value: 'secret' },
					],
				},
			},
		});

		expect(data.validationErrors).toEqual([
			{ field: 'model', message: 'Unsupported model' },
		]);
		expect(JSON.stringify(data)).not.toContain('secret');
	});
});
