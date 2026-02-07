import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { Readable } from 'stream';
import { sonioxApiRequest, sonioxApiRequestAllItems } from '../GenericFunctions';

/**
 * Builds the Soniox context object from individual UI fields.
 * API expects: { general: [{key,value}], text: string, terms: string[], translation_terms: [{source,target}] }
 */
function buildContextObject(additionalFields: IDataObject): IDataObject | undefined {
	const context: IDataObject = {};
	let hasContext = false;

	if (additionalFields.contextGeneral) {
		try {
			const general = JSON.parse(additionalFields.contextGeneral as string);
			if (Array.isArray(general) && general.length > 0) {
				context.general = general;
				hasContext = true;
			}
		} catch {
			// Invalid JSON — skip silently, user will see no effect
		}
	}

	if (additionalFields.contextText) {
		const text = (additionalFields.contextText as string).trim();
		if (text.length > 0) {
			context.text = text;
			hasContext = true;
		}
	}

	if (additionalFields.contextTerms) {
		const terms = (additionalFields.contextTerms as string)
			.split(',')
			.map(t => t.trim())
			.filter(t => t.length > 0);
		if (terms.length > 0) {
			context.terms = terms;
			hasContext = true;
		}
	}

	if (additionalFields.contextTranslationTerms) {
		try {
			const translationTerms = JSON.parse(additionalFields.contextTranslationTerms as string);
			if (Array.isArray(translationTerms) && translationTerms.length > 0) {
				context.translation_terms = translationTerms;
				hasContext = true;
			}
		} catch {
			// Invalid JSON — skip silently
		}
	}

	return hasContext ? context : undefined;
}

export async function transcriptionHandler(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	if (operation === 'transcribe') {
		// All-in-one transcription: Upload → Create → Wait → Get Transcript
		const source = this.getNodeParameter('source', i, 'binary') as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const deleteAudioFile = options.deleteAudioFile !== false; // Default to true
		const deleteTranscription = options.deleteTranscription === true; // Default to false
		const includeTokens = options.includeTokens === true; // Default to false

		// CRITICAL: Remove audio_url from additionalFields if somehow present
		delete additionalFields.audio_url;
		delete (additionalFields as any).audioUrl;

		let fileId: string | undefined;
		let audioUrl: string | undefined;

		if (source === 'binary') {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

			// Get binary data
			const binaryData = items[i].binary;
			if (!binaryData || !binaryData[binaryPropertyName]) {
				throw new NodeOperationError(
					this.getNode(),
					`No binary data found in property "${binaryPropertyName}". Please provide audio file data.`,
					{ itemIndex: i },
				);
			}

			// MIME Type Validation (Pre-flight)
			const mimeType = binaryData[binaryPropertyName].mimeType;
			if (mimeType && !mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid file type: ${mimeType}. Only audio and video files are supported (e.g., audio/mp3, video/mp4).`,
					{ itemIndex: i },
				);
			}

			// Step 1: Upload file
			const uploadFileName = binaryData[binaryPropertyName].fileName || `audio_${Date.now()}.${binaryData[binaryPropertyName].fileExtension || 'mp3'}`;
			
			// Use stream for memory efficiency
			let fileStream: Readable;
			if (binaryData[binaryPropertyName].id) {
				fileStream = await this.helpers.getBinaryStream(binaryData[binaryPropertyName].id);
			} else {
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				fileStream = Readable.from(buffer);
			}

			const formData = {
				file: {
					value: fileStream,
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

			// API returns 'id', not 'file_id'!
			fileId = uploadResponse.id || uploadResponse.file_id;
			
			if (!fileId) {
				throw new NodeOperationError(
					this.getNode(),
					`File upload failed: no id in response. Response: ${JSON.stringify(uploadResponse)}`,
					{ itemIndex: i },
				);
			}
		} else {
			// URL source
			audioUrl = this.getNodeParameter('fileUrl', i) as string;
			if (!audioUrl) {
				throw new NodeOperationError(this.getNode(), 'Audio URL is required', { itemIndex: i });
			}
		}

		// Validate model
		if (!model || !model.trim()) {
			throw new NodeOperationError(
				this.getNode(),
				'Model is required. Please select a model from the dropdown.',
				{ itemIndex: i },
			);
		}

		// Step 2: Create transcription
		const requestBody: IDataObject = {
			model: model.trim(),
		};

		if (fileId) {
			requestBody.file_id = fileId;
		} else if (audioUrl) {
			requestBody.audio_url = audioUrl;
		}

		// Add only specific fields from additionalFields (avoid sending audio_url accidentally)
		if (additionalFields.languageHints) {
			const hints = (additionalFields.languageHints as string)
				.split(',')
				.map(l => l.trim())
				.filter(l => l.length > 0);
			if (hints.length > 0) requestBody.language_hints = hints;
		}

		if (additionalFields.languageHintsStrict) {
			requestBody.language_hints_strict = additionalFields.languageHintsStrict;
		}

		const contextObj = buildContextObject(additionalFields);
		if (contextObj) requestBody.context = contextObj;

		if (additionalFields.translationType) {
			const translationType = additionalFields.translationType as string;
			if (translationType === 'one_way' && additionalFields.targetLanguage) {
				requestBody.translation = {
					type: 'one_way',
					target_language: additionalFields.targetLanguage,
				};
			} else if (translationType === 'two_way' && additionalFields.languageA && additionalFields.languageB) {
				requestBody.translation = {
					type: 'two_way',
					language_a: additionalFields.languageA,
					language_b: additionalFields.languageB,
				};
			}
		}

		if (additionalFields.enableSpeakerDiarization) {
			requestBody.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
		}

		if (additionalFields.enableLanguageIdentification) {
			requestBody.enable_language_identification = additionalFields.enableLanguageIdentification;
		}

		if (additionalFields.webhookUrl) {
			requestBody.webhook_url = additionalFields.webhookUrl;
			if (additionalFields.webhookAuthHeaderName) {
				requestBody.webhook_auth_header_name = additionalFields.webhookAuthHeaderName;
			}
			if (additionalFields.webhookAuthHeaderValue) {
				requestBody.webhook_auth_header_value = additionalFields.webhookAuthHeaderValue;
			}
		}

		if (additionalFields.clientReferenceId) {
			requestBody.client_reference_id = additionalFields.clientReferenceId;
		}

		// CRITICAL: Ensure NO audio_url is sent (API requires ONLY file_id OR audio_url, not both)
		if (!requestBody.file_id && !requestBody.audio_url) {
			throw new NodeOperationError(
				this.getNode(),
				`Neither file_id nor audio_url present in request body.`,
				{ itemIndex: i },
			);
		}

		const createResponse = await sonioxApiRequest.call(this, 'POST', '/transcriptions', requestBody);
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

		let isFirstPoll = true;
		while (Date.now() - startTime < maxWaitMs) {
			// First poll immediately (short audio may already be done), then with interval
			if (!isFirstPoll) {
				await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
			}
			isFirstPoll = false;

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

				// Build clean result: text at top level, tokens only if requested
				transcriptionResult = {
					...statusResponse,
					text: transcriptResponse.text || '',
				};
				if (includeTokens && transcriptResponse.tokens && transcriptionResult) {
					transcriptionResult.tokens = transcriptResponse.tokens;
				}
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

		// Return result immediately, then fire-and-forget cleanup (no latency added)
		returnData.push({ json: transcriptionResult });

		// Fire-and-forget cleanup — don't block result delivery
		if (deleteAudioFile && fileId) {
			sonioxApiRequest.call(this, 'DELETE', `/files/${fileId}`).catch(() => {});
		}
		if (deleteTranscription && transcriptionId) {
			sonioxApiRequest.call(this, 'DELETE', `/transcriptions/${transcriptionId}`).catch(() => {});
		}
	}

	else if (operation === 'create') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		// CRITICAL: Remove audio_url from additionalFields if somehow present
		delete additionalFields.audio_url;
		delete (additionalFields as any).audioUrl;

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

		const requestBody: IDataObject = {
			file_id: fileId.trim(),
			model: model.trim(),
		};

		if (additionalFields.languageHints) {
			const hints = (additionalFields.languageHints as string)
				.split(',')
				.map(l => l.trim())
				.filter(l => l.length > 0);
			if (hints.length > 0) requestBody.language_hints = hints;
		}

		if (additionalFields.languageHintsStrict) {
			requestBody.language_hints_strict = additionalFields.languageHintsStrict;
		}

		const contextObj = buildContextObject(additionalFields);
		if (contextObj) requestBody.context = contextObj;

		if (additionalFields.translationType) {
			const translationType = additionalFields.translationType as string;
			if (translationType === 'one_way' && additionalFields.targetLanguage) {
				requestBody.translation = {
					type: 'one_way',
					target_language: additionalFields.targetLanguage,
				};
			} else if (translationType === 'two_way' && additionalFields.languageA && additionalFields.languageB) {
				requestBody.translation = {
					type: 'two_way',
					language_a: additionalFields.languageA,
					language_b: additionalFields.languageB,
				};
			}
		}

		if (additionalFields.enableSpeakerDiarization) {
			requestBody.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
		}

		if (additionalFields.enableLanguageIdentification) {
			requestBody.enable_language_identification = additionalFields.enableLanguageIdentification;
		}

		const response = await sonioxApiRequest.call(
			this,
			'POST',
			'/transcriptions',
			requestBody,
		);

		returnData.push({ json: response });
	}

	else if (operation === 'createAndWait') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const deleteTranscription = options.deleteTranscription === true; // Default to false

		// CRITICAL: Remove audio_url from additionalFields if somehow present
		delete additionalFields.audio_url;
		delete (additionalFields as any).audioUrl;

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

		if (additionalFields.languageHints) {
			const hints = (additionalFields.languageHints as string).split(',').map(l => l.trim()).filter(l => l.length > 0);
			if (hints.length > 0) body.language_hints = hints;
		}

		if (additionalFields.languageHintsStrict) {
			body.language_hints_strict = additionalFields.languageHintsStrict;
		}

		const contextObj = buildContextObject(additionalFields);
		if (contextObj) body.context = contextObj;

		if (additionalFields.translationType) {
			const translationType = additionalFields.translationType as string;
			if (translationType === 'one_way' && additionalFields.targetLanguage) {
				body.translation = {
					type: 'one_way',
					target_language: additionalFields.targetLanguage,
				};
			} else if (translationType === 'two_way' && additionalFields.languageA && additionalFields.languageB) {
				body.translation = {
					type: 'two_way',
					language_a: additionalFields.languageA,
					language_b: additionalFields.languageB,
				};
			}
		}

		if (additionalFields.enableSpeakerDiarization) body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;

		if (additionalFields.enableLanguageIdentification) {
			body.enable_language_identification = additionalFields.enableLanguageIdentification;
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

		const startTime = Date.now();
		const maxWaitMs = maxWaitTime * 1000;
		const checkIntervalMs = checkInterval * 1000;
		let transcriptionResult: IDataObject | null = null;
		let lastStatus = '';

		let isFirstPoll = true;
		while (Date.now() - startTime < maxWaitMs) {
			// First poll immediately, then with interval
			if (!isFirstPoll) {
				await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
			}
			isFirstPoll = false;

			const statusResponse = await sonioxApiRequest.call(this, 'GET', `/transcriptions/${transcriptionId}`);
			lastStatus = (statusResponse.status as string) || '';

			// Soniox API statuses: "queued" | "processing" | "completed" | "error"
			if (lastStatus === 'completed') {
				// Get the actual transcript result
				const transcriptResponse = await sonioxApiRequest.call(this, 'GET', `/transcriptions/${transcriptionId}/transcript`);

				// Build clean result: text at top level, tokens only if requested
				transcriptionResult = {
					...statusResponse,
					text: transcriptResponse.text || '',
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

		// Return result immediately, fire-and-forget cleanup
		returnData.push({ json: transcriptionResult });

		if (deleteTranscription && transcriptionId) {
			sonioxApiRequest.call(this, 'DELETE', `/transcriptions/${transcriptionId}`).catch(() => {});
		}
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

		const transcriptions = Array.isArray(responseData) ? responseData : responseData.transcriptions || [];
		transcriptions.forEach((transcription: IDataObject) => {
			returnData.push({ json: transcription });
		});
	}

	return returnData;
}
