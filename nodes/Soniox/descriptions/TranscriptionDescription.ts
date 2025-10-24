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
				name: 'Create and Wait [Deprecated]',
				value: 'createAndWait',
				description: 'Use "Transcribe" instead - this will be removed in v0.6.0',
				action: 'Create and wait for transcription',
			},
			{
				name: 'Create [Deprecated]',
				value: 'create',
				description: 'Use "Transcribe" instead - this will be removed in v0.6.0',
				action: 'Create a transcription',
			},
			{
				name: 'Get By File [Deprecated]',
				value: 'getByFile',
				description: 'Use "Get" instead - this will be removed in v0.6.0',
				action: 'Get transcription by file',
			},
		],
		default: 'transcribe',
	},
];

export const transcriptionFields: INodeProperties[] = [
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
			},
		},
		description: 'Name of the binary property containing the audio file',
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
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Language code (e.g., en, es, fr, ru)',
				placeholder: 'en',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Additional context to improve transcription accuracy (e.g., domain-specific terms, names)',
				placeholder: 'Technical terms: API, webhook, JSON',
			},
			{
				displayName: 'Translation Languages',
				name: 'translationLanguages',
				type: 'string',
				default: '',
				description: 'Comma-separated language codes for translation (e.g., ru,es,fr)',
				placeholder: 'ru,es,fr',
			},
			{
				displayName: 'Enable Speaker Diarization',
				name: 'enableSpeakerDiarization',
				type: 'boolean',
				default: false,
				description: 'Whether to enable speaker diarization (identify different speakers)',
			},
			{
				displayName: 'Include Non-Final',
				name: 'includeNonFinal',
				type: 'boolean',
				default: false,
				description: 'Whether to include non-final results',
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
				displayName: 'Max Wait Time (seconds)',
				name: 'maxWaitTime',
				type: 'number',
				default: 300,
				description: 'Maximum time to wait for transcription completion (default: 300 seconds = 5 minutes)',
				typeOptions: {
					minValue: 10,
					maxValue: 1800,
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
	// List operation
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['list'],
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
				operation: ['list'],
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
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Language code (e.g., en, es, fr, ru)',
				placeholder: 'en',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Additional context to improve transcription accuracy (e.g., domain-specific terms, names)',
				placeholder: 'Technical terms: API, webhook, JSON',
			},
			{
				displayName: 'Translation Languages',
				name: 'translationLanguages',
				type: 'string',
				default: '',
				description: 'Comma-separated language codes for translation (e.g., ru,es,fr)',
				placeholder: 'ru,es,fr',
			},
			{
				displayName: 'Enable Speaker Diarization',
				name: 'enableSpeakerDiarization',
				type: 'boolean',
				default: false,
				description: 'Whether to enable speaker diarization (identify different speakers)',
			},
			{
				displayName: 'Include Non-Final',
				name: 'includeNonFinal',
				type: 'boolean',
				default: false,
				description: 'Whether to include non-final results',
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
					maxValue: 1800,
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
	// Get All operation
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['list'],
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
				operation: ['list'],
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
];
