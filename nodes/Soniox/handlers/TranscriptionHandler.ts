import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { Readable } from 'stream';
import { sonioxApiRequest, sonioxApiRequestAllItems } from '../GenericFunctions';
import { CONTENT_TYPES } from '../constants';

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
		if (additionalFields.language) requestBody.language = additionalFields.language;
		if (additionalFields.context) requestBody.context = additionalFields.context;

		if (additionalFields.translationLanguages) {
			const languages = (additionalFields.translationLanguages as string)
				.split(',')
				.map(l => l.trim())
				.filter(l => l.length > 0);
			if (languages.length > 0) requestBody.translation_languages = languages;
		}

		if (additionalFields.enableSpeakerDiarization) {
			requestBody.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
		}

		if (additionalFields.includeNonFinal) {
			requestBody.include_nonfinal = additionalFields.includeNonFinal;
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

		// Clean up file if requested
		if (deleteAudioFile && fileId) {
			try {
				await sonioxApiRequest.call(this, 'DELETE', `/files/${fileId}`);
			} catch (error) {
				// Ignore cleanup errors to ensure transcription result is returned
			}
		}

		// Clean up transcription if requested
		if (deleteTranscription && transcriptionId) {
			try {
				await sonioxApiRequest.call(this, 'DELETE', `/transcriptions/${transcriptionId}`);
			} catch (error) {
				// Ignore cleanup errors
			}
		}

		returnData.push({ json: transcriptionResult });
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

		if (additionalFields.language) {
			requestBody.language = additionalFields.language;
		}

		if (additionalFields.context) {
			requestBody.context = additionalFields.context;
		}

		if (additionalFields.translationLanguages) {
			// Parse comma-separated languages
			const languages = (additionalFields.translationLanguages as string)
				.split(',')
				.map(lang => lang.trim())
				.filter(lang => lang.length > 0);
			
			if (languages.length > 0) {
				requestBody.translation_languages = languages;
			}
		}

		if (additionalFields.enableSpeakerDiarization) {
			requestBody.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
		}

		if (additionalFields.includeNonFinal) {
			requestBody.include_nonfinal = additionalFields.includeNonFinal;
		}

		// CRITICAL: Ensure NO audio_url is sent (API requires ONLY file_id OR audio_url, not both)
		delete requestBody.audio_url;
		delete (requestBody as any).audioUrl;
		delete (requestBody as any)[' audio_url'];

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

		if (additionalFields.language) body.language = additionalFields.language;
		if (additionalFields.context) body.context = additionalFields.context;

		if (additionalFields.translationLanguages) {
			const languages = (additionalFields.translationLanguages as string).split(',').map(l => l.trim()).filter(l => l.length > 0);
			if (languages.length > 0) body.translation_languages = languages;
		}

		if (additionalFields.enableSpeakerDiarization) body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
		if (additionalFields.includeNonFinal) body.include_nonfinal = additionalFields.includeNonFinal;

		// CRITICAL: Ensure NO audio_url is sent (API requires ONLY file_id OR audio_url, not both)
		// Delete from body in all possible forms
		delete body.audio_url;
		delete (body as any).audioUrl;
		delete (body as any)[' audio_url'];
		// Also ensure file_id is present and valid
		if (!body.file_id) {
			throw new NodeOperationError(
				this.getNode(),
				`file_id is missing from request body. Upload may have failed.`,
				{ itemIndex: i },
			);
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

		// Clean up transcription if requested
		if (deleteTranscription && transcriptionId) {
			try {
				await sonioxApiRequest.call(this, 'DELETE', `/transcriptions/${transcriptionId}`);
			} catch (error) {
				// Ignore cleanup errors
			}
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

	return returnData;
}
