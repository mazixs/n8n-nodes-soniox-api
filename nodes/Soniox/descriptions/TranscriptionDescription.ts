import { INodeProperties } from 'n8n-workflow';
import { API_LIMITS } from '../constants';

export const transcriptionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
			},
		},
		options: [
			{
				name: 'Transcribe',
				value: 'transcribe',
				description: 'Upload audio and transcribe in one step (recommended)',
				action: 'Transcribe audio file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get existing transcription result by ID',
				action: 'Get transcription',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all transcriptions',
				action: 'List transcriptions',
			},
			{
				name: 'Create and Wait [Deprecated] → Transcribe',
				value: 'createAndWait',
				description: 'Deprecated: Use "Transcribe" instead - this will be removed in v0.6.0',
				action: 'Create and wait for transcription [Deprecated]',
			},
			{
				name: 'Create [Deprecated] → Transcribe',
				value: 'create',
				description: 'Deprecated: Use "Transcribe" instead - this will be removed in v0.6.0',
				action: 'Create a transcription [Deprecated]',
			},
			{
				name: 'Get By File [Deprecated] → Get',
				value: 'getByFile',
				description: 'Deprecated: Use "Get" instead - this will be removed in v0.6.0',
				action: 'Get transcription by file [Deprecated]',
			},
		],
		default: 'transcribe',
	},
];

export const transcriptionFields: INodeProperties[] = [
	{
		displayName: 'Audio Source',
		name: 'source',
		type: 'options',
		options: [
			{
				name: 'Binary Property',
				value: 'binary',
			},
			{
				name: 'URL',
				value: 'url',
			},
		],
		default: 'binary',
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['transcribe'],
			},
		},
		description: 'Source of the audio file to transcribe',
	},
	// Transcribe operation - Binary Property Name
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['transcribe'],
				source: ['binary'],
			},
		},
		description: 'Name of the binary property containing the audio file',
	},
	// Transcribe operation - Audio URL
	{
		displayName: 'Audio URL',
		name: 'fileUrl',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['transcribe'],
				source: ['url'],
			},
		},
		description: 'URL of the audio file to transcribe. Must be accessible by Soniox servers.',
		placeholder: 'https://example.com/audio.mp3',
	},
	// Transcribe operation - Model
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getModels',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['transcribe'],
			},
		},
		description: 'The model to use for transcription (loaded from Soniox API)',
		placeholder: 'Select a model',
	},
	// Transcribe operation - Additional Fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['transcribe'],
			},
		},
		options: [
			{
				displayName: 'Language Hints',
				name: 'languageHints',
				type: 'string',
				default: '',
				description: 'Comma-separated expected language codes in the audio (e.g., en,ru,es). If not specified, languages are auto-detected.',
				placeholder: 'en,ru',
			},
			{
				displayName: 'Language Hints Strict',
				name: 'languageHintsStrict',
				type: 'boolean',
				default: false,
				description: 'Whether the model should rely more on language hints (restrict to specified languages)',
			},
			{
				displayName: 'Context: General (JSON)',
				name: 'contextGeneral',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Structured key-value pairs as JSON array. Helps the model adapt to the correct domain. Example: [{"key":"domain","value":"Healthcare"},{"key":"topic","value":"Consultation"}]',
				placeholder: '[{"key":"domain","value":"Healthcare"},{"key":"topic","value":"Consultation"}]',
			},
			{
				displayName: 'Context: Text',
				name: 'contextText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Free-form background text to expand on general context (e.g., meeting notes, prior interactions, reference documents)',
				placeholder: 'The customer contacted support to update their auto policy after purchasing a new vehicle.',
			},
			{
				displayName: 'Context: Terms',
				name: 'contextTerms',
				type: 'string',
				default: '',
				description: 'Comma-separated domain-specific or uncommon words to improve transcription accuracy',
				placeholder: 'Celebrex, Zyrtec, Amoxicillin',
			},
			{
				displayName: 'Context: Translation Terms (JSON)',
				name: 'contextTranslationTerms',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'JSON array of source-target translation pairs. Example: [{"source":"MRI","target":"RM"},{"source":"stroke","target":"ictus"}]',
				placeholder: '[{"source":"MRI","target":"RM"}]',
			},
			{
				displayName: 'Translation Type',
				name: 'translationType',
				type: 'options',
				options: [
					{
						name: 'None',
						value: '',
					},
					{
						name: 'One-Way',
						value: 'one_way',
						description: 'Translate transcript into a single target language',
					},
					{
						name: 'Two-Way',
						value: 'two_way',
						description: 'Bilingual translation between two languages',
					},
				],
				default: '',
				description: 'Type of translation to apply to the transcription',
			},
			{
				displayName: 'Target Language',
				name: 'targetLanguage',
				type: 'string',
				default: '',
				description: 'Language code to translate the transcript into (for one-way translation)',
				placeholder: 'es',
				displayOptions: {
					show: {
						translationType: ['one_way'],
					},
				},
			},
			{
				displayName: 'Language A',
				name: 'languageA',
				type: 'string',
				default: '',
				description: 'First language for two-way translation',
				placeholder: 'en',
				displayOptions: {
					show: {
						translationType: ['two_way'],
					},
				},
			},
			{
				displayName: 'Language B',
				name: 'languageB',
				type: 'string',
				default: '',
				description: 'Second language for two-way translation',
				placeholder: 'ru',
				displayOptions: {
					show: {
						translationType: ['two_way'],
					},
				},
			},
			{
				displayName: 'Enable Speaker Diarization',
				name: 'enableSpeakerDiarization',
				type: 'boolean',
				default: false,
				description: 'Whether to enable speaker diarization (identify different speakers)',
			},
			{
				displayName: 'Enable Language Identification',
				name: 'enableLanguageIdentification',
				type: 'boolean',
				default: false,
				description: 'Whether to detect language for each part of the transcription',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				description: 'URL to receive webhook notification when transcription completes or fails',
				placeholder: 'https://example.com/webhook',
			},
			{
				displayName: 'Webhook Auth Header Name',
				name: 'webhookAuthHeaderName',
				type: 'string',
				default: '',
				description: 'Name of the authentication header for webhook requests',
				placeholder: 'Authorization',
			},
			{
				displayName: 'Webhook Auth Header Value',
				name: 'webhookAuthHeaderValue',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Value of the authentication header for webhook requests',
			},
			{
				displayName: 'Client Reference ID',
				name: 'clientReferenceId',
				type: 'string',
				default: '',
				description: 'Optional tracking identifier string (does not need to be unique)',
				placeholder: 'my-job-123',
			},
		],
	},
	// Transcribe - Options
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['transcribe'],
			},
		},
		options: [
			{
				displayName: 'Delete Audio File',
				name: 'deleteAudioFile',
				type: 'boolean',
				default: true,
				description: 'Whether to delete the uploaded audio file from Soniox servers after transcription completes',
			},
			{
				displayName: 'Delete Transcription',
				name: 'deleteTranscription',
				type: 'boolean',
				default: false,
				description: 'Whether to delete the transcription from Soniox servers after retrieval. Useful for privacy and staying within API limits.',
			},
			{
				displayName: 'Include Tokens',
				name: 'includeTokens',
				type: 'boolean',
				default: false,
				description: 'Whether to include detailed token-level data (word timestamps, confidence, speaker, language) in the output. When disabled, only clean text is returned.',
			},
			{
				displayName: 'Max Wait Time (seconds)',
				name: 'maxWaitTime',
				type: 'number',
				default: 300,
				description: 'Maximum time to wait for transcription completion (default: 300 seconds = 5 minutes)',
				typeOptions: {
					minValue: 10,
					maxValue: 18000,
				},
			},
			{
				displayName: 'Check Interval (seconds)',
				name: 'checkInterval',
				type: 'number',
				default: 5,
				description: 'How often to check transcription status (default: 5 seconds)',
				typeOptions: {
					minValue: 1,
					maxValue: 60,
				},
			},
		],
	},
	// Get operation
	{
		displayName: 'Transcription ID',
		name: 'transcriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['get'],
			},
		},
		description: 'The ID of the transcription',
	},
	// List operation (includes deprecated 'getAll' for backward compatibility)
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['list', 'getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['list', 'getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: API_LIMITS.MAX_ITEMS_PER_REQUEST,
		},
		default: API_LIMITS.DEFAULT_LIMIT,
		description: 'Max number of results to return',
	},
	// Create and Create and Wait operations - File ID
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['create', 'createAndWait'],
			},
		},
		description: 'The ID of the file to transcribe',
	},
	// Create and Create and Wait operations - Model
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getModels',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['create', 'createAndWait'],
			},
		},
		description: 'The model to use for transcription (loaded from Soniox API)',
		placeholder: 'Select a model',
	},
	// Create and Create and Wait operations - Additional Fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['create', 'createAndWait'],
			},
		},
		options: [
			{
				displayName: 'Language Hints',
				name: 'languageHints',
				type: 'string',
				default: '',
				description: 'Comma-separated expected language codes in the audio (e.g., en,ru,es). If not specified, languages are auto-detected.',
				placeholder: 'en,ru',
			},
			{
				displayName: 'Language Hints Strict',
				name: 'languageHintsStrict',
				type: 'boolean',
				default: false,
				description: 'Whether the model should rely more on language hints (restrict to specified languages)',
			},
			{
				displayName: 'Context: General (JSON)',
				name: 'contextGeneral',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Structured key-value pairs as JSON array. Helps the model adapt to the correct domain. Example: [{"key":"domain","value":"Healthcare"},{"key":"topic","value":"Consultation"}]',
				placeholder: '[{"key":"domain","value":"Healthcare"},{"key":"topic","value":"Consultation"}]',
			},
			{
				displayName: 'Context: Text',
				name: 'contextText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Free-form background text to expand on general context (e.g., meeting notes, prior interactions, reference documents)',
				placeholder: 'The customer contacted support to update their auto policy after purchasing a new vehicle.',
			},
			{
				displayName: 'Context: Terms',
				name: 'contextTerms',
				type: 'string',
				default: '',
				description: 'Comma-separated domain-specific or uncommon words to improve transcription accuracy',
				placeholder: 'Celebrex, Zyrtec, Amoxicillin',
			},
			{
				displayName: 'Context: Translation Terms (JSON)',
				name: 'contextTranslationTerms',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'JSON array of source-target translation pairs. Example: [{"source":"MRI","target":"RM"},{"source":"stroke","target":"ictus"}]',
				placeholder: '[{"source":"MRI","target":"RM"}]',
			},
			{
				displayName: 'Translation Type',
				name: 'translationType',
				type: 'options',
				options: [
					{
						name: 'None',
						value: '',
					},
					{
						name: 'One-Way',
						value: 'one_way',
						description: 'Translate transcript into a single target language',
					},
					{
						name: 'Two-Way',
						value: 'two_way',
						description: 'Bilingual translation between two languages',
					},
				],
				default: '',
				description: 'Type of translation to apply to the transcription',
			},
			{
				displayName: 'Target Language',
				name: 'targetLanguage',
				type: 'string',
				default: '',
				description: 'Language code to translate the transcript into (for one-way translation)',
				placeholder: 'es',
				displayOptions: {
					show: {
						translationType: ['one_way'],
					},
				},
			},
			{
				displayName: 'Language A',
				name: 'languageA',
				type: 'string',
				default: '',
				description: 'First language for two-way translation',
				placeholder: 'en',
				displayOptions: {
					show: {
						translationType: ['two_way'],
					},
				},
			},
			{
				displayName: 'Language B',
				name: 'languageB',
				type: 'string',
				default: '',
				description: 'Second language for two-way translation',
				placeholder: 'ru',
				displayOptions: {
					show: {
						translationType: ['two_way'],
					},
				},
			},
			{
				displayName: 'Enable Speaker Diarization',
				name: 'enableSpeakerDiarization',
				type: 'boolean',
				default: false,
				description: 'Whether to enable speaker diarization (identify different speakers)',
			},
			{
				displayName: 'Enable Language Identification',
				name: 'enableLanguageIdentification',
				type: 'boolean',
				default: false,
				description: 'Whether to detect language for each part of the transcription',
			},
		],
	},
	// Create and Wait - Options
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['createAndWait'],
			},
		},
		options: [
			{
				displayName: 'Max Wait Time (seconds)',
				name: 'maxWaitTime',
				type: 'number',
				default: 300,
				description: 'Maximum time to wait for transcription completion (default: 300 seconds = 5 minutes)',
				typeOptions: {
					minValue: 10,
					maxValue: 18000,
				},
			},
			{
				displayName: 'Check Interval (seconds)',
				name: 'checkInterval',
				type: 'number',
				default: 5,
				description: 'How often to check transcription status (default: 5 seconds)',
				typeOptions: {
					minValue: 1,
					maxValue: 60,
				},
			},
		],
	},
	// Get operation
	{
		displayName: 'Transcription ID',
		name: 'transcriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['get'],
			},
		},
		description: 'The ID of the transcription',
	},
	// Get By File operation
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['getByFile'],
			},
		},
		description: 'The file ID to get transcription for',
		placeholder: '{{$json.fileId}}',
	},
];
