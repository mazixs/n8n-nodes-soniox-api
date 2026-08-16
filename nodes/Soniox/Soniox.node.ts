import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	INodePropertyOptions,
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { fileFields, fileOperations } from './descriptions/FileDescription';
import {
	transcriptionFields,
	transcriptionOperations,
} from './descriptions/TranscriptionDescription';
import { modelOperations } from './descriptions/ModelDescription';
import { sonioxApiRequest } from './GenericFunctions';
import { fileHandler } from './handlers/FileHandler';
import { transcriptionHandler } from './handlers/TranscriptionHandler';
import { modelHandler } from './handlers/ModelHandler';
import { filterAsyncModels, normalizeModelOptions } from './modelUtils';
import { buildErrorData, formatErrorDataDescription } from './errorUtils';

const FALLBACK_ASYNC_MODELS: INodePropertyOptions[] = [
	{
		name: 'Speech-to-Text Async V5',
		value: 'stt-async-v5',
		description: 'Current async transcription model',
	},
	{
		name: 'Speech-to-Text Async V4',
		value: 'stt-async-v4',
		description: 'Legacy async transcription model',
	},
	{
		name: 'Speech-to-Text Async V3',
		value: 'stt-async-v3',
		description: 'Legacy async transcription model',
	},
];

export class Soniox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Soniox',
		name: 'soniox',
		icon: {
			light: 'file:soniox.svg',
			dark: 'file:soniox-dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle:
			'={{$parameter["operation"] === "transcribe" ? "Transcribe audio" : $parameter["operation"] === "createJob" ? "Create transcription job" : $parameter["operation"] === "getTranscript" ? "Get transcript" : $parameter["operation"] === "get" ? "Get job status" : $parameter["operation"] === "list" ? "List transcriptions" : "Compatibility operation"}}',
		description: 'Interact with Soniox Speech-to-Text API',
		documentationUrl:
			'https://github.com/mazixs/n8n-nodes-soniox-api#readme',
		defaults: {
			name: 'Soniox',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
			async getModels(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				try {
					const response = await sonioxApiRequest.call(this, 'GET', '/models');

					const options = filterAsyncModels(
						normalizeModelOptions(response),
					).map((model) => ({
						...model,
						description: model.name,
					})) as INodePropertyOptions[];

					return options.length > 0 ? options : FALLBACK_ASYNC_MODELS;
				} catch {
					// Fallback: only async models (real-time requires WebSocket, not supported in n8n)
					return FALLBACK_ASYNC_MODELS;
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
				} else if (resource === 'transcription') {
					const transcriptionData = await transcriptionHandler.call(
						this,
						operation,
						i,
					);
					returnData.push(...transcriptionData);
				} else if (resource === 'model') {
					const modelData = await modelHandler.call(this, operation, i);
					returnData.push(...modelData);
				}
			} catch (error) {
				const errorData = buildErrorData(error, {
					resource,
					operation,
					itemIndex: i,
				});
				const structuredDescription = formatErrorDataDescription(errorData);

				if (this.continueOnFail()) {
					returnData.push({
						json: errorData,
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeApiError) {
					throw new NodeApiError(
						this.getNode(),
						error.errorResponse ?? { error_message: error.message },
						{
							message: error.message,
							description: [error.description, structuredDescription]
								.filter(Boolean)
								.join('\n'),
							httpCode: error.httpCode ?? undefined,
							itemIndex: i,
						},
					);
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error.message, {
						description: structuredDescription,
						itemIndex: i,
					});
				}
				throw new NodeOperationError(
					this.getNode(),
					error instanceof Error ? error : String(error),
					{ description: structuredDescription, itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
