import { IDataObject } from 'n8n-workflow';
import {
	extractSonioxErrorDetails,
	isRetryableSonioxError,
	sanitizeValidationErrors,
} from './api/RequestUtils';

export interface ErrorOutputContext {
	resource?: string;
	operation?: string;
	itemIndex?: number;
	transcriptionId?: string;
}

function safeDocumentationUrl(value: string | undefined): string | undefined {
	if (!value) return undefined;

	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
		const anchor = /^#[A-Za-z0-9._-]+$/.test(url.hash) ? url.hash : '';
		return `${url.protocol}//${url.host}${url.pathname}${anchor}`;
	} catch {
		return undefined;
	}
}

/**
 * Converts an unknown n8n/Soniox error into a safe Continue On Fail payload.
 * The response body, headers, credentials and signed URLs are intentionally
 * never copied into workflow data.
 */
export function buildErrorData(
	error: unknown,
	context: ErrorOutputContext = {},
): IDataObject {
	const details = extractSonioxErrorDetails(error);
	const message =
		error instanceof Error && error.message ? error.message : details.message;
	const result: IDataObject = {
		error: message,
		retryable: isRetryableSonioxError(error),
	};

	if (details.errorType) result.errorType = details.errorType;
	if (details.statusCode !== undefined) result.statusCode = details.statusCode;
	if (details.requestId) result.requestId = details.requestId;
	const moreInfo = safeDocumentationUrl(details.moreInfo);
	if (moreInfo) result.moreInfo = moreInfo;
	if (details.validationErrors !== undefined)
		result.validationErrors = sanitizeValidationErrors(
			details.validationErrors,
		) as IDataObject;
	if (details.retryAfter) result.retryAfter = details.retryAfter;
	if (context.resource) result.resource = context.resource;
	if (context.operation) result.operation = context.operation;
	if (context.itemIndex !== undefined) result.itemIndex = context.itemIndex;
	if (context.transcriptionId) result.transcriptionId = context.transcriptionId;

	const safeDetails = formatErrorDataDescription(result);
	if (safeDetails) result.details = safeDetails;

	return result;
}

export function formatErrorDataDescription(data: IDataObject): string {
	return Object.entries(data)
		.filter(([key]) => key !== 'error' && key !== 'details')
		.map(([key, value]) => `${key}: ${String(value)}`)
		.join('\n');
}
