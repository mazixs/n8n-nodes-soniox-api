import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SonioxApi implements ICredentialType {
	name = 'sonioxApi';
	displayName = 'Soniox API';
	documentationUrl = 'https://soniox.com/docs/stt/get-started';
	icon = 'file:soniox.svg' as any;
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The Soniox API key for authentication',
		},
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://api.soniox.com/v1',
			description: 'The base URL for Soniox API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '={{`Bearer ${$credentials.apiKey}`}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/models',
			method: 'GET',
		},
	};
}
