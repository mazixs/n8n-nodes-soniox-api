import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	INodePropertyOptions,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { fileFields, fileOperations } from './descriptions/FileDescription';
import { transcriptionFields, transcriptionOperations } from './descriptions/TranscriptionDescription';
import { modelFields, modelOperations } from './descriptions/ModelDescription';
import { sonioxApiRequest } from './GenericFunctions';
import { fileHandler } from './handlers/FileHandler';
import { transcriptionHandler } from './handlers/TranscriptionHandler';
import { modelHandler } from './handlers/ModelHandler';

export class Soniox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Soniox',
		name: 'soniox',
		icon: 'file:soniox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Soniox Speech-to-Text API',
		defaults: {
			name: 'Soniox',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sonioxApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Model',
						value: 'model',
					},
					{
						name: 'Transcription',
						value: 'transcription',
					},
				],
				default: 'transcription',
			},
			...fileOperations,
			...fileFields,
			...transcriptionOperations,
			...transcriptionFields,
			...modelOperations,
			...modelFields,
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const response = await sonioxApiRequest.call(
						this,
						'GET',
						'/models',
					);

					const models = Array.isArray(response) ? response : response.models || [];

					// Transform models into options
					const options = models.map((model: IDataObject) => {
						// Handle different response formats
						let modelId: string;
						let modelName: string;
						let modelDescription: string | undefined;

						if (typeof model === 'string') {
							// Simple string format
							modelId = model;
							modelName = model;
						} else {
							// Object format
							modelId = (model.model_id || model.id || model.name || model.value) as string;
							modelName = (model.name || model.display_name || modelId) as string;
							modelDescription = model.description as string | undefined;
						}

						return {
							name: modelName,
							value: modelId,
							description: modelDescription || modelName,
						};
					}).filter((option: INodePropertyOptions) => option.value); // Remove invalid entries

					if (options.length === 0) {
						throw new Error('No models returned from API');
					}

					return options;
				} catch {
					// Fallback if API fails
					return [
						{ name: 'English v2 Low Latency', value: 'en_v2_lowlatency', description: 'English v2 Low Latency model' },
						{ name: 'English v2', value: 'en_v2', description: 'English v2 model' },
					];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'file') {
					const fileData = await fileHandler.call(this, operation, i);
					returnData.push(...fileData);
				}
				else if (resource === 'transcription') {
					const transcriptionData = await transcriptionHandler.call(this, operation, i);
					returnData.push(...transcriptionData);
				}
				else if (resource === 'model') {
					const modelData = await modelHandler.call(this, operation, i);
					returnData.push(...modelData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
