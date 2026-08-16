import { describe, expect, it } from 'vitest';
import {
	buildRequestOptions,
	extractSonioxErrorDetails,
	isRetryableSonioxError,
	getRetryDelayMs,
} from '../../nodes/Soniox/api/RequestUtils';

describe('Soniox request utilities', () => {
	it('builds modern n8n request options with url and JSON body', () => {
		const options = buildRequestOptions({
			method: 'POST',
			url: 'https://api.soniox.com/v1/transcriptions',
			body: { model: 'stt-async-v5' },
			qs: { limit: 10 },
			timeout: 30_000,
		});

		expect(options).toEqual({
			method: 'POST',
			url: 'https://api.soniox.com/v1/transcriptions',
			qs: { limit: 10 },
			body: { model: 'stt-async-v5' },
			headers: { 'Content-Type': 'application/json' },
			json: true,
			timeout: 30_000,
		});
		expect(options).not.toHaveProperty('uri');
	});

	it('builds multipart options without forcing a JSON content type', () => {
		const formData = { file: { value: 'stream' } };
		const options = buildRequestOptions({
			method: 'POST',
			url: 'https://api.soniox.com/v1/files',
			formData,
			timeout: 60_000,
		});

		expect(options).toMatchObject({
			method: 'POST',
			url: 'https://api.soniox.com/v1/files',
			body: formData,
			json: true,
			timeout: 60_000,
		});
		expect(options).not.toHaveProperty('headers.Content-Type');
	});

	it('extracts structured quota details from a Soniox error response', () => {
		const details = extractSonioxErrorDetails({
			statusCode: 429,
			response: {
				body: {
					error_type: 'limit_exceeded',
					error_message: 'Too many pending transcriptions',
					request_id: 'req_123',
					more_info: 'https://soniox.com/docs/api-reference/errors',
				},
			},
		});

		expect(details).toMatchObject({
			statusCode: 429,
			errorType: 'limit_exceeded',
			message: 'Too many pending transcriptions',
			requestId: 'req_123',
		});
	});

	it('does not retry a quota exhaustion response', () => {
		expect(
			isRetryableSonioxError({
				statusCode: 429,
				body: { error_type: 'limit_exceeded' },
			}),
		).toBe(false);
	});

	it('retries transient responses and honors a bounded Retry-After delay', () => {
		expect(isRetryableSonioxError({ statusCode: 503 })).toBe(true);
		expect(getRetryDelayMs(0)).toBe(1_000);
		expect(getRetryDelayMs(2)).toBe(4_000);
		expect(getRetryDelayMs(0, '120')).toBe(10_000);
	});
});
