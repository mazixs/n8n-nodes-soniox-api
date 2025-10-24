import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

import {
	API_LIMITS,
	CONTENT_TYPES,
	RETRY_CONFIG,
	TIMEOUTS,
	RETRYABLE_STATUS_CODES,
} from './constants';

/**
 * Задержка с exponential backoff
 */
async function delay(attempt: number): Promise<void> {
	const delayMs = Math.min(
		RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
		RETRY_CONFIG.MAX_DELAY,
	);
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function sonioxApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('sonioxApi');

	const options: IRequestOptions = {
		method,
		qs,
		uri: uri || `${credentials.apiUrl}${endpoint}`,
		json: true,
		timeout: option.formData ? TIMEOUTS.FILE_UPLOAD : TIMEOUTS.API_REQUEST,
	};

	// Headers - Authorization будет добавлен через credentials.authenticate
	options.headers = {};

	// Handle multipart/form-data (для file upload)
	if (option.formData) {
		options.formData = option.formData as IDataObject;
		// Content-Type устанавливается автоматически для multipart
	} else {
		// Обычный JSON request
		options.body = body;
		options.headers['Content-Type'] = CONTENT_TYPES.JSON;
	}

	// Retry логика с exponential backoff
	let lastError: any;
	for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
		try {
			return await this.helpers.requestWithAuthentication.call(this, 'sonioxApi', options);
		} catch (error: any) {
			lastError = error;

			const statusCode = error.statusCode || error.response?.statusCode;

			// Проверяем, нужен ли retry
			const shouldRetry =
				attempt < RETRY_CONFIG.MAX_RETRIES &&
				(RETRYABLE_STATUS_CODES.includes(statusCode) || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET');

			if (!shouldRetry) {
				break;
			}

			// Обработка rate limiting (429)
			if (statusCode === 429) {
				const retryAfter = error.response?.headers['retry-after'];
				if (retryAfter) {
					const waitMs = parseInt(retryAfter, 10) * 1000;
					await new Promise((resolve) => setTimeout(resolve, waitMs));
					continue;
				}
			}

			// Exponential backoff для остальных ошибок
			await delay(attempt);
		}
	}

	throw new NodeApiError(this.getNode(), lastError);
}

export async function sonioxApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];
	let responseData;
	qs.limit = API_LIMITS.PAGINATION_LIMIT;
	qs.offset = 0;

	do {
		responseData = await sonioxApiRequest.call(this, method, endpoint, body, qs);
		returnData.push(...responseData.items);
		qs.offset = (qs.offset as number) + qs.limit;
	} while (responseData.items.length !== 0);

	return returnData;
}
