import { INodeProperties } from 'n8n-workflow';
import { API_LIMITS } from '../constants';
import { localLimitsField } from './LimitDescription';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file by ID',
				action: 'Get a file',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description:
					'Deprecated: Use "List" instead. Retained for workflows created with older versions.',
				action: 'Get many files',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all files',
				action: 'List files',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload an audio file',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];

export const fileFields: INodeProperties[] = [
	// Upload operation
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		description: 'Name of the binary property containing the file',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		description: 'Name of the file to upload',
	},
	{
		...localLimitsField,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	// Get/Delete operations
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['get', 'delete'],
			},
		},
		description: 'The ID of the file',
	},
	// List operation (supports both 'list' and 'getAll' for backward compatibility)
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['file'],
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
		default: 50,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['list', 'getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: API_LIMITS.MAX_ITEMS_PER_REQUEST,
		},
		description: 'Max number of results to return',
	},
];
