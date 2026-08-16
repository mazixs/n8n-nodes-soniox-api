export interface RequestOptionsInput {
	method: string;
	url: string;
	qs?: Record<string, unknown>;
	body?: unknown;
	formData?: unknown;
	timeout: number;
}

export interface SonioxRequestOptions {
	method: string;
	url: string;
	qs?: Record<string, unknown>;
	body?: unknown;
	formData?: unknown;
	headers?: Record<string, string>;
	json: true;
	timeout: number;
}

export interface SonioxErrorDetails {
	statusCode?: number;
	errorType?: string;
	message: string;
	requestId?: string;
	moreInfo?: string;
	validationErrors?: unknown;
	retryAfter?: string;
}

const RETRYABLE_STATUS_CODES = new Set([408, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
	'ECONNRESET',
	'ETIMEDOUT',
	'ECONNREFUSED',
	'EAI_AGAIN',
]);
const BASE_RETRY_DELAY_MS = 1_000;
const BACKOFF_MULTIPLIER = 2;
const MAX_RETRY_DELAY_MS = 10_000;
const MAX_VALIDATION_ITEMS = 20;
const MAX_VALIDATION_TEXT_LENGTH = 500;
const SAFE_VALIDATION_KEYS = new Set([
	'code',
	'field',
	'message',
	'path',
	'reason',
	'type',
]);

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function asErrorPayload(error: unknown): Record<string, unknown> {
	const errorRecord = asRecord(error);
	const response = asRecord(errorRecord.response);
	const candidates = [
		errorRecord.body,
		response.body,
		errorRecord.errorResponse,
		errorRecord.data,
		response.data,
		errorRecord.error,
	];

	for (const candidate of candidates) {
		if (typeof candidate === 'string') {
			try {
				const parsed = JSON.parse(candidate) as unknown;
				if (typeof parsed === 'object' && parsed !== null)
					return parsed as Record<string, unknown>;
			} catch {
				// Keep looking for a structured response.
			}
		}
		if (typeof candidate === 'object' && candidate !== null)
			return candidate as Record<string, unknown>;
	}

	return {};
}

/**
 * Keep useful validation diagnostics while excluding reflected values and
 * arbitrary response fields from workflow output and n8n error objects.
 */
export function sanitizeValidationErrors(value: unknown): unknown {
	if (value === null || value === undefined) return undefined;
	if (typeof value !== 'object')
		return String(value).slice(0, MAX_VALIDATION_TEXT_LENGTH);
	if (Array.isArray(value)) {
		return value
			.slice(0, MAX_VALIDATION_ITEMS)
			.map((entry) => sanitizeValidationErrors(entry));
	}

	const record = asRecord(value);
	const safe: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(record)) {
		if (!SAFE_VALIDATION_KEYS.has(key)) continue;
		safe[key] =
			typeof entry === 'object'
				? sanitizeValidationErrors(entry)
				: String(entry).slice(0, MAX_VALIDATION_TEXT_LENGTH);
	}

	return Object.keys(safe).length > 0
		? safe
		: { message: 'Validation details omitted for safety.' };
}

export function buildRequestOptions(
	input: RequestOptionsInput,
): SonioxRequestOptions {
	const options: SonioxRequestOptions = {
		method: input.method,
		url: input.url,
		json: true,
		timeout: input.timeout,
	};

	if (input.qs) options.qs = { ...input.qs };

	if (input.formData !== undefined) {
		options.body = input.formData;
	} else {
		options.body = input.body ?? {};
		options.headers = { 'Content-Type': 'application/json' };
	}

	return options;
}

export function extractSonioxErrorDetails(error: unknown): SonioxErrorDetails {
	const errorRecord = asRecord(error);
	const response = asRecord(errorRecord.response);
	const payload = asErrorPayload(error);
	const nestedError = asRecord(payload.error);
	const statusCode =
		asNumber(errorRecord.statusCode) ??
		asNumber(response.statusCode) ??
		asNumber(errorRecord.status) ??
		asNumber(response.status) ??
		asNumber(errorRecord.httpCode) ??
		asNumber(payload.status_code);
	const errorType =
		String(
			payload.error_type ??
				nestedError.error_type ??
				errorRecord.error_type ??
				'',
		).trim() || undefined;
	const message = String(
		payload.error_message ??
			payload.message ??
			nestedError.error_message ??
			nestedError.message ??
			errorRecord.message ??
			(statusCode
				? `Soniox API request failed with status ${statusCode}`
				: 'Soniox API request failed'),
	);
	const headers = asRecord(response.headers);
	const retryAfter =
		headers['retry-after'] ??
		headers['Retry-After'] ??
		payload.retry_after ??
		errorRecord.retryAfter;

	return {
		statusCode,
		errorType,
		message,
		requestId:
			String(
				payload.request_id ??
					nestedError.request_id ??
					errorRecord.request_id ??
					'',
			).trim() || undefined,
		moreInfo:
			String(payload.more_info ?? nestedError.more_info ?? '').trim() ||
			undefined,
		validationErrors:
			payload.validation_errors ?? nestedError.validation_errors,
		retryAfter:
			retryAfter === undefined
				? undefined
				: String(retryAfter).trim() || undefined,
	};
}

export function isRetryableSonioxError(error: unknown): boolean {
	const details = extractSonioxErrorDetails(error);
	if (details.errorType === 'limit_exceeded') {
		// A 429 with Retry-After normally represents a temporary RPM/concurrency
		// window. Without that hint, avoid retrying account-wide quota exhaustion.
		return details.statusCode === 429 && details.retryAfter !== undefined;
	}
	if (details.statusCode === 429) return true;
	if (
		details.statusCode !== undefined &&
		RETRYABLE_STATUS_CODES.has(details.statusCode)
	)
		return true;

	const errorRecord = asRecord(error);
	return (
		typeof errorRecord.code === 'string' &&
		RETRYABLE_NETWORK_CODES.has(errorRecord.code)
	);
}

export function getRetryDelayMs(attempt: number, retryAfter?: string): number {
	if (retryAfter) {
		const retryAfterSeconds = Number(retryAfter);
		if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
			return Math.min(retryAfterSeconds * 1_000, MAX_RETRY_DELAY_MS);
		}
	}

	return Math.min(
		BASE_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, Math.max(0, attempt)),
		MAX_RETRY_DELAY_MS,
	);
}
