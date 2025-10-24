import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { fileFields, fileOperations } from './descriptions/FileDescription';
import { transcriptionFields, transcriptionOperations } from './descriptions/TranscriptionDescription';
import { modelFields, modelOperations } from './descriptions/ModelDescription';
import { sonioxApiRequest, sonioxApiRequestAllItems } from './GenericFunctions';
import { CONTENT_TYPES } from './constants';

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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'file') {
					if (operation === 'upload') {
						// 1. Получить параметры
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const fileName = this.getNodeParameter('fileName', i, '') as string;

						// 2. Валидация binary data
						const itemBinary = items[i].binary;
						if (!itemBinary) {
							throw new NodeOperationError(
								this.getNode(),
								'No binary data exists on input item. Please connect a node that provides binary data.',
								{ itemIndex: i },
							);
						}

						const binaryData = itemBinary[binaryPropertyName];
						if (!binaryData) {
							const availableProperties = Object.keys(itemBinary);
							throw new NodeOperationError(
								this.getNode(),
								`Binary property "${binaryPropertyName}" not found. Available: ${availableProperties.join(', ')}`,
								{ itemIndex: i },
							);
						}

						// 3. Получить Buffer из binary data
						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						// 4. Определить имя файла
						const uploadFileName = fileName || binaryData.fileName || 'file';

						// 5. Подготовить formData для multipart/form-data
						const formData = {
							file: {
								value: buffer,
								options: {
									filename: uploadFileName,
									contentType: binaryData.mimeType || CONTENT_TYPES.BINARY,
								},
							},
						};

						// 6. Upload через API
						const response = await sonioxApiRequest.call(
							this,
							'POST',
							'/files',
							{},
							{},
							undefined,
							{ formData },
						);

						// 7. Вернуть результат
						returnData.push({
							json: {
								fileId: response.file_id,
								fileName: uploadFileName,
								mimeType: binaryData.mimeType,
								fileSize: binaryData.fileSize,
								uploadedAt: new Date().toISOString(),
							},
						});
					}

					else if (operation === 'get') {
						const fileId = this.getNodeParameter('fileId', i) as string;

						const response = await sonioxApiRequest.call(
							this,
							'GET',
							`/files/${fileId}`,
						);

						returnData.push({ json: response });
					}

					else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						let responseData;
						if (returnAll) {
							responseData = await sonioxApiRequestAllItems.call(
								this,
								'GET',
								'/files',
							);
						} else {
							const limit = this.getNodeParameter('limit', i);
							responseData = await sonioxApiRequest.call(
								this,
								'GET',
								'/files',
								{},
								{ limit },
							);
						}

						const fileItems = Array.isArray(responseData) ? responseData : responseData.items || [];
						fileItems.forEach((item: IDataObject) => {
							returnData.push({ json: item });
						});
					}

					else if (operation === 'delete') {
						const fileId = this.getNodeParameter('fileId', i) as string;

						await sonioxApiRequest.call(
							this,
							'DELETE',
							`/files/${fileId}`,
						);

						returnData.push({
							json: {
								success: true,
								fileId,
							},
						});
					}
				}

				else if (resource === 'transcription') {
					if (operation === 'create') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const model = this.getNodeParameter('model', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						const body: IDataObject = {
							file_id: fileId,
						};

						if (model) {
							body.model = model;
						}

						if (additionalFields.language) {
							body.language = additionalFields.language;
						}

						if (additionalFields.enableSpeakerDiarization) {
							body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
						}

						if (additionalFields.includeNonFinal) {
							body.include_nonfinal = additionalFields.includeNonFinal;
						}

						const response = await sonioxApiRequest.call(
							this,
							'POST',
							'/transcriptions',
							body,
						);

						returnData.push({ json: response });
					}

					else if (operation === 'get') {
						const transcriptionId = this.getNodeParameter('transcriptionId', i) as string;

						const response = await sonioxApiRequest.call(
							this,
							'GET',
							`/transcriptions/${transcriptionId}`,
						);

						returnData.push({ json: response });
					}

					else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						let responseData;
						if (returnAll) {
							responseData = await sonioxApiRequestAllItems.call(
								this,
								'GET',
								'/transcriptions',
							);
						} else {
							const limit = this.getNodeParameter('limit', i);
							responseData = await sonioxApiRequest.call(
								this,
								'GET',
								'/transcriptions',
								{},
								{ limit },
							);
						}

						const transcriptionItems = Array.isArray(responseData) ? responseData : responseData.items || [];
						transcriptionItems.forEach((item: IDataObject) => {
							returnData.push({ json: item });
						});
					}
				}

				else if (resource === 'model') {
					if (operation === 'getAll') {
						const response = await sonioxApiRequest.call(
							this,
							'GET',
							'/models',
						);

						const models = Array.isArray(response) ? response : response.models || [];
						models.forEach((model: IDataObject) => {
							returnData.push({ json: model });
						});
					}
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
