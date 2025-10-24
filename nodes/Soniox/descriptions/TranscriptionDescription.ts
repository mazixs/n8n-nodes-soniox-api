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
				name: 'Create',
				value: 'create',
				description: 'Create a transcription',
				action: 'Create a transcription',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a transcription',
				action: 'Get a transcription',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all transcriptions',
				action: 'Get all transcriptions',
			},
		],
		default: 'create',
	},
];

export const transcriptionFields: INodeProperties[] = [
	// Create operation
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['create'],
			},
		},
		description: 'The ID of the file to transcribe',
	},
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
				operation: ['create'],
			},
		},
		description: 'The model to use for transcription (loaded from Soniox API)',
		placeholder: 'Select a model',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Language code (e.g., en, es, fr)',
			},
			{
				displayName: 'Enable Speaker Diarization',
				name: 'enableSpeakerDiarization',
				type: 'boolean',
				default: false,
				description: 'Whether to enable speaker diarization',
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
	// Get All operation
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['transcription'],
				operation: ['getAll'],
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
				operation: ['getAll'],
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
