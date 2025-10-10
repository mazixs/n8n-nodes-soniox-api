import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

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
	};

	// Headers
	options.headers = {
		'Authorization': `Bearer ${credentials.apiKey}`,
	};

	// Handle multipart/form-data (для file upload)
	if (option.formData) {
		options.formData = option.formData as IDataObject;
		// Content-Type устанавливается автоматически для multipart
	} else {
		// Обычный JSON request
		options.body = body;
		options.headers['Content-Type'] = 'application/json';
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any);
	}
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
	qs.limit = 100;
	qs.offset = 0;

	do {
		responseData = await sonioxApiRequest.call(this, method, endpoint, body, qs);
		returnData.push(...responseData.items);
		qs.offset = (qs.offset as number) + qs.limit;
	} while (responseData.items.length !== 0);

	return returnData;
}
