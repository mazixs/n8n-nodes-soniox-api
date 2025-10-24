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

						// 7. Вернуть результат (с полным ответом API + удобные поля)
						returnData.push({
							json: {
								// Convenient fields for easy access
								fileId: response.file_id,
								file_id: response.file_id, // Alternative name for compatibility
								fileName: uploadFileName,
								mimeType: binaryData.mimeType,
								fileSize: binaryData.fileSize,
								uploadedAt: new Date().toISOString(),
								// Full API response
								...response,
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

					else if (operation === 'list' || operation === 'getAll') {
						// Support both 'list' (new) and 'getAll' (deprecated) for backward compatibility
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
					if (operation === 'transcribe') {
						// All-in-one transcription: Upload → Create → Wait → Get Transcript
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const model = this.getNodeParameter('model', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						const options = this.getNodeParameter('options', i, {}) as IDataObject;

						// Get binary data
						const binaryData = items[i].binary;
						if (!binaryData || !binaryData[binaryPropertyName]) {
							throw new NodeOperationError(
								this.getNode(),
								`No binary data found in property "${binaryPropertyName}". Please provide audio file data.`,
								{ itemIndex: i },
							);
						}

						// Validate model
						if (!model || !model.trim()) {
							throw new NodeOperationError(
								this.getNode(),
								'Model is required. Please select a model from the dropdown.',
								{ itemIndex: i },
							);
						}

						// Step 1: Upload file
						const uploadFileName = binaryData[binaryPropertyName].fileName || `audio_${Date.now()}.${binaryData[binaryPropertyName].fileExtension || 'mp3'}`;
						const formData = {
							file: {
								value: await this.helpers.getBinaryDataBuffer(i, binaryPropertyName),
								options: {
									filename: uploadFileName,
									contentType: binaryData[binaryPropertyName].mimeType,
								},
							},
						};

						const uploadResponse = await sonioxApiRequest.call(
							this,
							'POST',
							'/files',
							{},
							{},
							undefined,
							{ formData },
						);
						const fileId = uploadResponse.file_id;

						// Step 2: Create transcription
						const body: IDataObject = {
							file_id: fileId,
							model: model.trim(),
						};

						if (additionalFields.language) body.language = additionalFields.language;
						if (additionalFields.context) body.context = additionalFields.context;

						if (additionalFields.translationLanguages) {
							const languages = (additionalFields.translationLanguages as string)
								.split(',')
								.map(l => l.trim())
								.filter(l => l.length > 0);
							if (languages.length > 0) body.translation_languages = languages;
						}

						if (additionalFields.enableSpeakerDiarization) {
							body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
						}

						if (additionalFields.includeNonFinal) {
							body.include_nonfinal = additionalFields.includeNonFinal;
						}

						const createResponse = await sonioxApiRequest.call(this, 'POST', '/transcriptions', body);
						const transcriptionId = createResponse.transcription_id || createResponse.id;

						if (!transcriptionId) {
							throw new NodeOperationError(
								this.getNode(),
								`Failed to create transcription: API did not return transcription_id or id. Response: ${JSON.stringify(createResponse)}`,
								{ itemIndex: i },
							);
						}

						// Step 3: Poll for completion
						const maxWaitTime = (options.maxWaitTime as number) || 300;
						const checkInterval = (options.checkInterval as number) || 5;
						const startTime = Date.now();
						const maxWaitMs = maxWaitTime * 1000;
						const checkIntervalMs = checkInterval * 1000;

						let transcriptionResult: IDataObject | null = null;
						let lastStatus = '';

						while (Date.now() - startTime < maxWaitMs) {
							await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
							const statusResponse = await sonioxApiRequest.call(this, 'GET', `/transcriptions/${transcriptionId}`);
							lastStatus = (statusResponse.status as string) || '';

							// Soniox API statuses: "queued" | "processing" | "completed" | "error"
							if (lastStatus === 'completed') {
								// Step 4: Get transcript
								const transcriptResponse = await sonioxApiRequest.call(
									this,
									'GET',
									`/transcriptions/${transcriptionId}/transcript`,
								);

								transcriptionResult = {
									...statusResponse,
									transcript: transcriptResponse,
								};
								break;
							}

							if (lastStatus === 'error') {
								// Soniox API returns error details in these fields
								const errorMsg = statusResponse.message || statusResponse.error_message || statusResponse.error_type || 'Unknown error';
								const requestId = statusResponse.request_id ? ` (Request ID: ${statusResponse.request_id})` : '';
								throw new NodeOperationError(
									this.getNode(),
									`Transcription failed: ${errorMsg}${requestId}`,
									{ itemIndex: i },
								);
							}

							// Continue polling for "queued" or "processing" statuses
						}

						if (!transcriptionResult) {
							throw new NodeOperationError(
								this.getNode(),
								`Transcription timeout after ${maxWaitTime}s. Status: ${lastStatus}. ID: ${transcriptionId}`,
								{ itemIndex: i },
							);
						}

						returnData.push({ json: transcriptionResult });
					}

					else if (operation === 'create') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const model = this.getNodeParameter('model', i, '') as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						// Validate fileId (must be UUID)
						if (!fileId || !fileId.trim()) {
							throw new NodeOperationError(
								this.getNode(),
								'File ID is required',
								{ itemIndex: i },
							);
						}

						// UUID format validation
						const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
						if (!uuidRegex.test(fileId.trim())) {
							throw new NodeOperationError(
								this.getNode(),
								`File ID must be a valid UUID. Received: "${fileId}". Please use the file_id from the File Upload operation.`,
								{ itemIndex: i },
							);
						}

						// Validate model
						if (!model || !model.trim()) {
							throw new NodeOperationError(
								this.getNode(),
								'Model is required. Please select a model from the dropdown.',
								{ itemIndex: i },
							);
						}

						const body: IDataObject = {
							file_id: fileId.trim(),
							model: model.trim(),
						};

						if (additionalFields.language) {
							body.language = additionalFields.language;
						}

						if (additionalFields.context) {
							body.context = additionalFields.context;
						}

						if (additionalFields.translationLanguages) {
							// Parse comma-separated languages
							const languages = (additionalFields.translationLanguages as string)
								.split(',')
								.map(lang => lang.trim())
								.filter(lang => lang.length > 0);
							
							if (languages.length > 0) {
								body.translation_languages = languages;
							}
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

				else if (operation === 'createAndWait') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const model = this.getNodeParameter('model', i, '') as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					const maxWaitTime = (options.maxWaitTime as number) || 300;
					const checkInterval = (options.checkInterval as number) || 5;

					if (!fileId || !fileId.trim()) {
						throw new NodeOperationError(this.getNode(), 'File ID is required', { itemIndex: i });
					}

					const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
					if (!uuidRegex.test(fileId.trim())) {
						throw new NodeOperationError(this.getNode(), `File ID must be a valid UUID. Received: "${fileId}".`, { itemIndex: i });
					}

					if (!model || !model.trim()) {
						throw new NodeOperationError(this.getNode(), 'Model is required.', { itemIndex: i });
					}

					const body: IDataObject = { file_id: fileId.trim(), model: model.trim() };

					if (additionalFields.language) body.language = additionalFields.language;
					if (additionalFields.context) body.context = additionalFields.context;

					if (additionalFields.translationLanguages) {
						const languages = (additionalFields.translationLanguages as string).split(',').map(l => l.trim()).filter(l => l.length > 0);
						if (languages.length > 0) body.translation_languages = languages;
					}

					if (additionalFields.enableSpeakerDiarization) body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
					if (additionalFields.includeNonFinal) body.include_nonfinal = additionalFields.includeNonFinal;

					const createResponse = await sonioxApiRequest.call(this, 'POST', '/transcriptions', body);
					const transcriptionId = createResponse.transcription_id || createResponse.id;

					if (!transcriptionId) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to create transcription: API did not return transcription_id or id. Response: ${JSON.stringify(createResponse)}`,
							{ itemIndex: i },
						);
					}

					const startTime = Date.now();
					const maxWaitMs = maxWaitTime * 1000;
					const checkIntervalMs = checkInterval * 1000;
					let transcriptionResult: IDataObject | null = null;
					let lastStatus = '';

					while (Date.now() - startTime < maxWaitMs) {
						await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
						const statusResponse = await sonioxApiRequest.call(this, 'GET', `/transcriptions/${transcriptionId}`);
						lastStatus = (statusResponse.status as string) || '';

						// Soniox API statuses: "queued" | "processing" | "completed" | "error"
						if (lastStatus === 'completed') {
							// Get the actual transcript result
							const transcriptResponse = await sonioxApiRequest.call(this, 'GET', `/transcriptions/${transcriptionId}/transcript`);
							transcriptionResult = {
								...statusResponse,
								transcript: transcriptResponse,
							};
							break;
						}

						if (lastStatus === 'error') {
							// Soniox API returns error details in these fields
							const errorMsg = statusResponse.message || statusResponse.error_message || statusResponse.error_type || 'Unknown error';
							const requestId = statusResponse.request_id ? ` (Request ID: ${statusResponse.request_id})` : '';
							throw new NodeOperationError(
								this.getNode(),
								`Transcription failed: ${errorMsg}${requestId}`,
								{ itemIndex: i },
							);
						}

						// Continue polling for "queued" or "processing" statuses
					}

					if (!transcriptionResult) {
						throw new NodeOperationError(this.getNode(), `Timeout after ${maxWaitTime}s. Status: ${lastStatus}. ID: ${transcriptionId}`, { itemIndex: i });
					}

					returnData.push({ json: transcriptionResult });
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

					else if (operation === 'getByFile') {
						const fileId = this.getNodeParameter('fileId', i) as string;

						// UUID format validation
						const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
						if (!uuidRegex.test(fileId.trim())) {
							throw new NodeOperationError(
								this.getNode(),
								`File ID must be a valid UUID. Received: "${fileId}". Please use the fileId from the File Upload operation.`,
								{ itemIndex: i },
							);
						}

						// Get transcription by file_id query parameter
						const response = await sonioxApiRequest.call(
							this,
							'GET',
							'/transcriptions',
							{},
							{ file_id: fileId.trim() },
						);

						// API returns array of transcriptions for this file
						const transcriptions = Array.isArray(response) ? response : response.items || [];
						
						if (transcriptions.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								`No transcriptions found for file ID: ${fileId}. Make sure the transcription has been created.`,
								{ itemIndex: i },
							);
						}

						// Return the latest transcription (or all if multiple)
						transcriptions.forEach((transcription: IDataObject) => {
							returnData.push({ json: transcription });
						});
					}

					else if (operation === 'list' || operation === 'getAll') {
						// Support both 'list' (new) and 'getAll' (deprecated) for backward compatibility
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

						const transcriptions = responseData.transcriptions || [];
						transcriptions.forEach((transcription: IDataObject) => {
							returnData.push({ json: transcription });
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
