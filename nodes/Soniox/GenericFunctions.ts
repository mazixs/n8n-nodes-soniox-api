import {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
	sleep,
} from 'n8n-workflow';

import {
	buildRequestOptions,
	extractSonioxErrorDetails,
	getRetryDelayMs,
	isRetryableSonioxError,
} from './api/RequestUtils';
import { API_LIMITS, RETRY_CONFIG, TIMEOUTS } from './constants';

type SonioxContext = IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

interface SonioxRequestOptions {
	formData?: FormData;
}

function buildApiErrorResponse(error: unknown): JsonObject {
	const details = extractSonioxErrorDetails(error);
	const response: JsonObject = {
		error_type: details.errorType ?? 'request_failed',
		error_message: details.message,
	};

	if (details.requestId) response.request_id = details.requestId;
	if (details.moreInfo) response.more_info = details.moreInfo;
	if (details.validationErrors !== undefined) {
		response.validation_errors = JSON.stringify(details.validationErrors);
	}

	return response;
}

function formatApiErrorDescription(error: unknown): string {
	const details = extractSonioxErrorDetails(error);
	const parts = [`Error type: ${details.errorType ?? 'unknown'}`];
	if (details.requestId) parts.push(`Request ID: ${details.requestId}`);
	if (details.validationErrors !== undefined) {
		parts.push(
			`Validation details: ${JSON.stringify(details.validationErrors)}`,
		);
	}
	if (details.moreInfo) parts.push(`More information: ${details.moreInfo}`);
	return parts.join('\n');
}

async function callAuthenticatedRequest(
	context: SonioxContext,
	options: IHttpRequestOptions,
): Promise<IDataObject> {
	const modernHelper = context.helpers.httpRequestWithAuthentication;
	if (typeof modernHelper === 'function') {
		return (await modernHelper.call(
			context,
			'sonioxApi',
			options,
		)) as IDataObject;
	}

	// Older n8n versions exposed only the legacy helper. Keep a dynamic fallback
	// so the package can still run there without importing deprecated types.
	const helperCollection = context.helpers as unknown as Record<
		string,
		unknown
	>;
	const legacyHelper = helperCollection.requestWithAuthentication;
	if (typeof legacyHelper !== 'function') {
		throw new Error(
			'This n8n version does not provide an authenticated HTTP helper.',
		);
	}

	const legacyOptions: Record<string, unknown> = {
		...options,
		uri: options.url,
	};
	if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
		legacyOptions.formData = options.body;
		delete legacyOptions.body;
	}

	return (await legacyHelper.call(
		context,
		'sonioxApi',
		legacyOptions,
	)) as IDataObject;
}

export async function sonioxApiRequest(
	this: SonioxContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: SonioxRequestOptions = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('sonioxApi');
	const apiUrl = String(credentials.apiUrl ?? '').replace(/\/$/, '');
	const requestUrl = uri || `${apiUrl}${endpoint}`;
	const requestOptions = buildRequestOptions({
		method,
		url: requestUrl,
		qs,
		body,
		formData: option.formData,
		timeout: option.formData ? TIMEOUTS.FILE_UPLOAD : TIMEOUTS.API_REQUEST,
	}) as IHttpRequestOptions;

	let lastError: unknown;
	for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
		try {
			return await callAuthenticatedRequest(this, requestOptions);
		} catch (error: unknown) {
			lastError = error;
			if (attempt >= RETRY_CONFIG.MAX_RETRIES || !isRetryableSonioxError(error))
				break;

			const details = extractSonioxErrorDetails(error);
			await sleep(getRetryDelayMs(attempt, details.retryAfter));
		}
	}

	const details = extractSonioxErrorDetails(lastError);
	throw new NodeApiError(this.getNode(), buildApiErrorResponse(lastError), {
		message: details.message,
		description: formatApiErrorDescription(lastError),
		httpCode: details.statusCode?.toString(),
	});
}

export async function sonioxApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	itemsKey?: string,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	const key =
		itemsKey ||
		(endpoint.includes('/files')
			? 'files'
			: endpoint.includes('/transcriptions')
				? 'transcriptions'
				: 'items');
	let cursor: string | undefined;

	do {
		const pageQs: IDataObject = {
			...qs,
			limit: API_LIMITS.PAGINATION_LIMIT,
		};
		if (cursor) pageQs.cursor = cursor;

		const responseData = await sonioxApiRequest.call(
			this,
			method,
			endpoint,
			body,
			pageQs,
		);
		const response = Array.isArray(responseData) ? {} : responseData;
		const items = response[key];
		if (Array.isArray(items)) {
			returnData.push(
				...items.filter(
					(item): item is IDataObject =>
						typeof item === 'object' && item !== null,
				),
			);
		}

		const nextCursor = response.next_page_cursor;
		cursor =
			typeof nextCursor === 'string' && nextCursor.length > 0
				? nextCursor
				: undefined;
	} while (cursor);

	return returnData;
}
