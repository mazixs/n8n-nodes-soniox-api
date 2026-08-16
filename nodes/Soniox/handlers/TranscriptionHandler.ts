import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	NodeApiError,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';
import {
	sonioxApiRequest,
	sonioxApiRequestAllItems,
} from '../GenericFunctions';
import { createFileFormData } from '../binaryUtils';
import {
	BinaryMetadata,
	parseLocalLimitOptions,
	validateLocalLimits,
} from '../limits';
import {
	getTranscriptionFailureMessage,
	buildContextObject,
	isTerminalTranscriptionFailure,
} from '../transcriptionUtils';

/**
 * Groups tokens by speaker into conversation segments.
 * Soniox API returns speaker info only in tokens — this function
 * assembles a readable speaker-segmented output.
 */
function buildSpeakerSegments(tokens: IDataObject[]): IDataObject[] {
	if (!Array.isArray(tokens) || tokens.length === 0) return [];

	const segments: IDataObject[] = [];
	let currentSpeaker: string | null = null;
	let currentText = '';
	let segmentStartMs: number | null = null;
	let segmentEndMs: number | null = null;

	for (const token of tokens) {
		const speaker = (token.speaker as string) || 'unknown';
		const text = (token.text as string) || '';

		if (speaker !== currentSpeaker) {
			// Flush previous segment
			if (currentSpeaker !== null && currentText.trim().length > 0) {
				segments.push({
					speaker: currentSpeaker,
					text: currentText.trim(),
					start_ms: segmentStartMs,
					end_ms: segmentEndMs,
				});
			}
			currentSpeaker = speaker;
			currentText = text;
			segmentStartMs = (token.start_ms as number) ?? null;
			segmentEndMs = (token.end_ms as number) ?? null;
		} else {
			currentText += text;
			segmentEndMs = (token.end_ms as number) ?? segmentEndMs;
		}
	}

	// Flush last segment
	if (currentSpeaker !== null && currentText.trim().length > 0) {
		segments.push({
			speaker: currentSpeaker,
			text: currentText.trim(),
			start_ms: segmentStartMs,
			end_ms: segmentEndMs,
		});
	}

	return segments;
}

async function cleanupResource(
	context: IExecuteFunctions,
	endpoint: string,
): Promise<void> {
	try {
		await sonioxApiRequest.call(context, 'DELETE', endpoint);
	} catch {
		// Cleanup is best effort and must never replace the original result or error.
	}
}

interface TranscriptionSource {
	fileId?: string;
	audioUrl?: string;
}

interface UploadedFile {
	fileId: string;
}

const MIN_POLL_SECONDS = 0.1;
const MAX_POLL_INTERVAL_SECONDS = 60;
const MAX_WAIT_SECONDS = 18_000;
const MAX_POLL_REQUESTS = 10_000;

function getPollingSeconds(
	context: IExecuteFunctions,
	options: IDataObject,
	name: string,
	label: string,
	defaultValue: number,
	maxValue: number,
	itemIndex: number,
): number {
	const rawValue = options[name];
	if (rawValue === undefined || rawValue === null || rawValue === '')
		return defaultValue;

	const value = Number(rawValue);
	if (
		!Number.isFinite(value) ||
		value < MIN_POLL_SECONDS ||
		value > maxValue
	) {
		throw new NodeOperationError(
			context.getNode(),
			`${label} must be between ${MIN_POLL_SECONDS} and ${maxValue} seconds.`,
			{ itemIndex },
		);
	}

	return value;
}

async function uploadBinaryFile(
	context: IExecuteFunctions,
	items: INodeExecutionData[],
	itemIndex: number,
	binaryPropertyName: string,
	localLimits: ReturnType<typeof parseLocalLimitOptions>,
	fileNameOverride?: string,
): Promise<UploadedFile> {
	const binaryData = items[itemIndex].binary;
	if (!binaryData || !binaryData[binaryPropertyName]) {
		throw new NodeOperationError(
			context.getNode(),
			`No binary data found in property "${binaryPropertyName}". Please provide audio file data.`,
			{ itemIndex },
		);
	}

	const binary = binaryData[binaryPropertyName];
	const mimeType = binary.mimeType;
	if (
		mimeType &&
		!mimeType.startsWith('audio/') &&
		!mimeType.startsWith('video/')
	) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid file type: ${mimeType}. Only audio and video files are supported (e.g., audio/mp3, video/mp4).`,
			{ itemIndex },
		);
	}
	// Reject known metadata limits before materializing the binary buffer.
	validateLocalLimits(binary as unknown as BinaryMetadata, localLimits);

	const buffer = await context.helpers.getBinaryDataBuffer(
		itemIndex,
		binaryPropertyName,
	);
	validateLocalLimits(
		{
			...(binary as unknown as BinaryMetadata),
			fileSize: buffer.length,
		},
		localLimits,
	);

	const fileName =
		fileNameOverride ||
		binary.fileName ||
		`audio_${Date.now()}.${binary.fileExtension || 'mp3'}`;
	const formData = createFileFormData(
		buffer,
		fileName,
		mimeType || 'application/octet-stream',
	);
	const response = await sonioxApiRequest.call(
		context,
		'POST',
		'/files',
		{},
		{},
		undefined,
		{ formData },
	);
	const rawFileId = response.id ?? response.file_id;
	const fileId = typeof rawFileId === 'string' ? rawFileId : '';
	if (!fileId) {
		throw new NodeOperationError(
			context.getNode(),
			'File upload failed: Soniox did not return a file ID.',
			{ itemIndex },
		);
	}

	return { fileId };
}

function buildTranscriptionRequestBody(
	model: string,
	additionalFields: IDataObject,
	source: TranscriptionSource,
): IDataObject {
	const requestBody: IDataObject = { model: model.trim() };
	if (source.fileId) requestBody.file_id = source.fileId;
	else if (source.audioUrl) requestBody.audio_url = source.audioUrl;

	if (additionalFields.languageHints) {
		const hints = String(additionalFields.languageHints)
			.split(',')
			.map((language) => language.trim())
			.filter((language) => language.length > 0);
		if (hints.length > 0) requestBody.language_hints = hints;
	}
	if (additionalFields.languageHintsStrict)
		requestBody.language_hints_strict = additionalFields.languageHintsStrict;

	const context = buildContextObject(additionalFields);
	if (context) requestBody.context = context;

	const translationType = additionalFields.translationType;
	if (translationType === 'one_way' && additionalFields.targetLanguage) {
		requestBody.translation = {
			type: 'one_way',
			target_language: additionalFields.targetLanguage,
		};
	} else if (
		translationType === 'two_way' &&
		additionalFields.languageA &&
		additionalFields.languageB
	) {
		requestBody.translation = {
			type: 'two_way',
			language_a: additionalFields.languageA,
			language_b: additionalFields.languageB,
		};
	}

	if (additionalFields.enableSpeakerDiarization)
		requestBody.enable_speaker_diarization =
			additionalFields.enableSpeakerDiarization;
	if (additionalFields.enableLanguageIdentification)
		requestBody.enable_language_identification =
			additionalFields.enableLanguageIdentification;

	if (additionalFields.webhookUrl) {
		requestBody.webhook_url = additionalFields.webhookUrl;
		if (additionalFields.webhookAuthHeaderName)
			requestBody.webhook_auth_header_name =
				additionalFields.webhookAuthHeaderName;
		if (additionalFields.webhookAuthHeaderValue)
			requestBody.webhook_auth_header_value =
				additionalFields.webhookAuthHeaderValue;
	}
	if (additionalFields.clientReferenceId)
		requestBody.client_reference_id = additionalFields.clientReferenceId;

	return requestBody;
}

function getTranscriptionId(response: IDataObject): string | undefined {
	const rawId = response.transcription_id ?? response.id;
	return rawId === undefined || rawId === null ? undefined : String(rawId);
}

export async function transcriptionHandler(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	if (operation === 'createJob') {
		const source = this.getNodeParameter('jobSource', i, 'binary') as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter(
			'additionalFields',
			i,
			{},
		) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const localLimits = parseLocalLimitOptions(options.limits);
		let uploadedFileId: string | undefined;
		let sourceFileId: string | undefined;

		if (!model.trim()) {
			throw new NodeOperationError(
				this.getNode(),
				'Model is required. Please select a model from the dropdown.',
				{ itemIndex: i },
			);
		}

		try {
			let sourceData: TranscriptionSource;
			if (source === 'binary') {
				const binaryPropertyName = this.getNodeParameter(
					'binaryPropertyName',
					i,
				) as string;
				const uploaded = await uploadBinaryFile(
					this,
					items,
					i,
					binaryPropertyName,
					localLimits,
				);
				uploadedFileId = uploaded.fileId;
				sourceFileId = uploaded.fileId;
				sourceData = { fileId: uploaded.fileId };
			} else if (source === 'url') {
				const audioUrl = String(
					this.getNodeParameter('fileUrl', i, ''),
				).trim();
				if (!audioUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'Audio URL is required.',
						{ itemIndex: i },
					);
				}
				sourceData = { audioUrl };
			} else if (source === 'fileId') {
				const fileId = String(
					this.getNodeParameter('fileId', i, ''),
				).trim();
				if (!fileId) {
					throw new NodeOperationError(
						this.getNode(),
						'File ID is required.',
						{ itemIndex: i },
					);
				}
				sourceFileId = fileId;
				sourceData = { fileId };
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`Unsupported job source: ${source}`,
					{ itemIndex: i },
				);
			}

			const requestBody = buildTranscriptionRequestBody(
				model,
				additionalFields,
				sourceData,
			);
			const response = await sonioxApiRequest.call(
				this,
				'POST',
				'/transcriptions',
				requestBody,
			);
			const transcriptionId = getTranscriptionId(response);
			if (!transcriptionId) {
				throw new NodeOperationError(
					this.getNode(),
						'Failed to create transcription: Soniox did not return a transcription ID.',
					{ itemIndex: i },
				);
			}

			returnData.push({
				json: {
					...response,
					transcriptionId,
					...(sourceFileId ? { fileId: sourceFileId } : {}),
				},
				pairedItem: { item: i },
			});
		} catch (error) {
			if (uploadedFileId)
				await cleanupResource(
					this,
					`/files/${encodeURIComponent(uploadedFileId)}`,
				);
			if (error instanceof NodeApiError) {
				throw new NodeApiError(
					this.getNode(),
					error.errorResponse ?? { error_message: error.message },
					{
						message: error.message,
						description: error.description ?? undefined,
						httpCode: error.httpCode ?? undefined,
						itemIndex: i,
					},
				);
			}
			if (error instanceof NodeOperationError) {
				throw new NodeOperationError(this.getNode(), error.message, {
					description: error.description ?? undefined,
					itemIndex: i,
				});
			}
			throw new NodeOperationError(
				this.getNode(),
				error instanceof Error ? error : String(error),
				{ itemIndex: i },
			);
		}
	} else if (operation === 'transcribe') {
		// All-in-one transcription: Upload → Create → Wait → Get Transcript
		const source = this.getNodeParameter('source', i, 'binary') as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter(
			'additionalFields',
			i,
			{},
		) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const deleteAudioFile = options.deleteAudioFile !== false; // Default to true
		const deleteTranscription = options.deleteTranscription === true; // Default to false
		const includeTokens = options.includeTokens === true; // Default to false

		// CRITICAL: Remove audio_url from additionalFields if somehow present
		delete additionalFields.audio_url;
		delete additionalFields.audioUrl;

		let fileId: string | undefined;
		let audioUrl: string | undefined;
		let transcriptionId: string | undefined;
		const localLimits = parseLocalLimitOptions(options.limits);

		if (!model || !model.trim()) {
			throw new NodeOperationError(
				this.getNode(),
				'Model is required. Please select a model from the dropdown.',
				{ itemIndex: i },
			);
		}
		const maxWaitTime = getPollingSeconds(
			this,
			options,
			'maxWaitTime',
			'Max wait time',
			300,
			MAX_WAIT_SECONDS,
			i,
		);
		const checkInterval = getPollingSeconds(
			this,
			options,
			'checkInterval',
			'Check interval',
			5,
			MAX_POLL_INTERVAL_SECONDS,
			i,
		);

		try {
			if (source === 'binary') {
				const binaryPropertyName = this.getNodeParameter(
					'binaryPropertyName',
					i,
				) as string;
				const uploaded = await uploadBinaryFile(
					this,
					items,
					i,
					binaryPropertyName,
					localLimits,
				);
				fileId = uploaded.fileId;
			} else {
				// URL source
				audioUrl = this.getNodeParameter('fileUrl', i) as string;
				if (!audioUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'Audio URL is required',
						{ itemIndex: i },
					);
				}
			}

			// Step 2: Create transcription. Keep this request builder shared with the
			// modern and legacy operations so their Soniox payloads cannot drift apart.
			const requestBody = buildTranscriptionRequestBody(
				model,
				additionalFields,
				{
					fileId,
					audioUrl,
				},
			);

			// CRITICAL: Ensure NO audio_url is sent (API requires ONLY file_id OR audio_url, not both)
			if (!requestBody.file_id && !requestBody.audio_url) {
				throw new NodeOperationError(
					this.getNode(),
					`Neither file_id nor audio_url present in request body.`,
					{ itemIndex: i },
				);
			}

			const createResponse = await sonioxApiRequest.call(
				this,
				'POST',
				'/transcriptions',
				requestBody,
			);
			const rawTranscriptionId =
				createResponse.transcription_id ?? createResponse.id;
			transcriptionId = rawTranscriptionId
				? String(rawTranscriptionId)
				: undefined;

			if (!transcriptionId) {
				throw new NodeOperationError(
					this.getNode(),
						'Failed to create transcription: Soniox did not return a transcription ID.',
					{ itemIndex: i },
				);
			}

			// Step 3: Poll for completion
			const startTime = Date.now();
			const maxWaitMs = maxWaitTime * 1000;
			const checkIntervalMs = checkInterval * 1000;

			let transcriptionResult: IDataObject | null = null;
			let lastStatus = '';
			let pollRequests = 0;

			let isFirstPoll = true;
			while (
				Date.now() - startTime < maxWaitMs &&
				pollRequests < MAX_POLL_REQUESTS
			) {
				pollRequests += 1;
				// First poll immediately (short audio may already be done), then with interval
				if (!isFirstPoll) {
					await sleep(checkIntervalMs);
				}
				isFirstPoll = false;

				const statusResponse = await sonioxApiRequest.call(
					this,
					'GET',
					`/transcriptions/${encodeURIComponent(transcriptionId)}`,
				);
				lastStatus = (statusResponse.status as string) || '';

				// Soniox API statuses: "queued" | "processing" | "completed" | "failed".
				if (lastStatus === 'completed') {
					// Step 4: Get transcript
					const transcriptResponse = await sonioxApiRequest.call(
						this,
						'GET',
						`/transcriptions/${encodeURIComponent(transcriptionId)}/transcript`,
					);

					// Build clean result: text at top level
					transcriptionResult = {
						...statusResponse,
						text: transcriptResponse.text || '',
					};

					// Speaker diarization: group tokens by speaker into segments
					const hasDiarization =
						additionalFields.enableSpeakerDiarization === true;
					if (
						hasDiarization &&
						transcriptResponse.tokens &&
						transcriptionResult
					) {
						transcriptionResult.speakers = buildSpeakerSegments(
							transcriptResponse.tokens as IDataObject[],
						);
					}

					if (
						includeTokens &&
						transcriptResponse.tokens &&
						transcriptionResult
					) {
						transcriptionResult.tokens = transcriptResponse.tokens;
					}
					break;
				}

				if (isTerminalTranscriptionFailure(lastStatus)) {
					throw new NodeOperationError(
						this.getNode(),
						`Transcription failed: ${getTranscriptionFailureMessage(statusResponse)}`,
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

			// Cleanup runs in finally after the result is prepared and is best effort.
			returnData.push({ json: transcriptionResult, pairedItem: { item: i } });
		} finally {
			if (deleteAudioFile && fileId)
				await cleanupResource(this, `/files/${encodeURIComponent(fileId)}`);
			if (deleteTranscription && transcriptionId)
				await cleanupResource(
					this,
					`/transcriptions/${encodeURIComponent(transcriptionId)}`,
				);
		}
	} else if (operation === 'create') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter(
			'additionalFields',
			i,
			{},
		) as IDataObject;

		// CRITICAL: Remove audio_url from additionalFields if somehow present
		delete additionalFields.audio_url;
		delete additionalFields.audioUrl;

		// Validate fileId (must be UUID)
		if (!fileId || !fileId.trim()) {
			throw new NodeOperationError(this.getNode(), 'File ID is required', {
				itemIndex: i,
			});
		}

		// UUID format validation
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

		const requestBody = buildTranscriptionRequestBody(model, additionalFields, {
			fileId: fileId.trim(),
		});

		const response = await sonioxApiRequest.call(
			this,
			'POST',
			'/transcriptions',
			requestBody,
		);

		returnData.push({ json: response, pairedItem: { item: i } });
	} else if (operation === 'createAndWait') {
		const fileId = this.getNodeParameter('fileId', i) as string;
		const model = this.getNodeParameter('model', i, '') as string;
		const additionalFields = this.getNodeParameter(
			'additionalFields',
			i,
			{},
		) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const deleteTranscription = options.deleteTranscription === true; // Default to false

		// CRITICAL: Remove audio_url from additionalFields if somehow present
		delete additionalFields.audio_url;
		delete additionalFields.audioUrl;

		if (!fileId || !fileId.trim()) {
			throw new NodeOperationError(this.getNode(), 'File ID is required', {
				itemIndex: i,
			});
		}

		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(fileId.trim())) {
			throw new NodeOperationError(
				this.getNode(),
				`File ID must be a valid UUID. Received: "${fileId}".`,
				{ itemIndex: i },
			);
		}

		if (!model || !model.trim()) {
			throw new NodeOperationError(this.getNode(), 'Model is required.', {
				itemIndex: i,
			});
		}
		const maxWaitTime = getPollingSeconds(
			this,
			options,
			'maxWaitTime',
			'Max wait time',
			300,
			MAX_WAIT_SECONDS,
			i,
		);
		const checkInterval = getPollingSeconds(
			this,
			options,
			'checkInterval',
			'Check interval',
			5,
			MAX_POLL_INTERVAL_SECONDS,
			i,
		);

		const body = buildTranscriptionRequestBody(model, additionalFields, {
			fileId: fileId.trim(),
		});

		let transcriptionId: string | undefined;
		try {
			const createResponse = await sonioxApiRequest.call(
				this,
				'POST',
				'/transcriptions',
				body,
			);
			const rawTranscriptionId =
				createResponse.transcription_id ?? createResponse.id;
			transcriptionId = rawTranscriptionId
				? String(rawTranscriptionId)
				: undefined;

			if (!transcriptionId) {
				throw new NodeOperationError(
					this.getNode(),
						'Failed to create transcription: Soniox did not return a transcription ID.',
					{ itemIndex: i },
				);
			}

			const startTime = Date.now();
			const maxWaitMs = maxWaitTime * 1000;
			const checkIntervalMs = checkInterval * 1000;
			let transcriptionResult: IDataObject | null = null;
			let lastStatus = '';
			let pollRequests = 0;

			let isFirstPoll = true;
			while (
				Date.now() - startTime < maxWaitMs &&
				pollRequests < MAX_POLL_REQUESTS
			) {
				pollRequests += 1;
				// First poll immediately, then with interval
				if (!isFirstPoll) {
					await sleep(checkIntervalMs);
				}
				isFirstPoll = false;

				const statusResponse = await sonioxApiRequest.call(
					this,
					'GET',
					`/transcriptions/${encodeURIComponent(transcriptionId)}`,
				);
				lastStatus = (statusResponse.status as string) || '';

				// Soniox API statuses: "queued" | "processing" | "completed" | "failed".
				if (lastStatus === 'completed') {
					// Get the actual transcript result
					const transcriptResponse = await sonioxApiRequest.call(
						this,
						'GET',
						`/transcriptions/${encodeURIComponent(transcriptionId)}/transcript`,
					);

					// Build clean result: text at top level
					transcriptionResult = {
						...statusResponse,
						text: transcriptResponse.text || '',
					};

					// Speaker diarization: group tokens by speaker into segments
					const hasDiarization =
						additionalFields.enableSpeakerDiarization === true;
					if (
						hasDiarization &&
						transcriptResponse.tokens &&
						transcriptionResult
					) {
						transcriptionResult.speakers = buildSpeakerSegments(
							transcriptResponse.tokens as IDataObject[],
						);
					}

					break;
				}

				if (isTerminalTranscriptionFailure(lastStatus)) {
					throw new NodeOperationError(
						this.getNode(),
						`Transcription failed: ${getTranscriptionFailureMessage(statusResponse)}`,
						{ itemIndex: i },
					);
				}

				// Continue polling for "queued" or "processing" statuses
			}

			if (!transcriptionResult) {
				throw new NodeOperationError(
					this.getNode(),
					`Timeout after ${maxWaitTime}s. Status: ${lastStatus}. ID: ${transcriptionId}`,
					{ itemIndex: i },
				);
			}

			// Cleanup runs in finally and does not replace the transcription result.
			returnData.push({ json: transcriptionResult, pairedItem: { item: i } });
		} finally {
			if (deleteTranscription && transcriptionId)
				await cleanupResource(
					this,
					`/transcriptions/${encodeURIComponent(transcriptionId)}`,
				);
		}
	} else if (operation === 'getTranscript') {
		const transcriptionId = String(
			this.getNodeParameter('transcriptionId', i, ''),
		).trim();
		if (!transcriptionId) {
			throw new NodeOperationError(
				this.getNode(),
				'Transcription ID is required.',
				{ itemIndex: i },
			);
		}

		try {
			const response = await sonioxApiRequest.call(
				this,
				'GET',
				`/transcriptions/${encodeURIComponent(transcriptionId)}/transcript`,
			);
			returnData.push({
				json: { ...response, transcriptionId },
				pairedItem: { item: i },
			});
		} catch (error) {
			if (error instanceof NodeApiError && error.httpCode === '409') {
				throw new NodeOperationError(
					this.getNode(),
					`Transcription "${transcriptionId}" is not complete yet. Use Get Job Status or wait for the Soniox webhook before requesting the transcript.`,
					{ itemIndex: i },
				);
			}
			if (error instanceof NodeApiError) {
				throw new NodeApiError(
					this.getNode(),
					error.errorResponse ?? { error_message: error.message },
					{
						message: error.message,
						description: error.description ?? undefined,
						httpCode: error.httpCode ?? undefined,
						itemIndex: i,
					},
				);
			}
			if (error instanceof NodeOperationError) {
				throw new NodeOperationError(this.getNode(), error.message, {
					description: error.description ?? undefined,
					itemIndex: i,
				});
			}
			throw new NodeOperationError(
				this.getNode(),
				error instanceof Error ? error : String(error),
				{ itemIndex: i },
			);
		}
	} else if (operation === 'get') {
		const transcriptionId = this.getNodeParameter(
			'transcriptionId',
			i,
		) as string;

		const response = await sonioxApiRequest.call(
			this,
			'GET',
			`/transcriptions/${encodeURIComponent(transcriptionId)}`,
		);

		returnData.push({ json: response, pairedItem: { item: i } });
	} else if (operation === 'getByFile') {
		const fileId = this.getNodeParameter('fileId', i) as string;

		// UUID format validation
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
		const rawTranscriptions = Array.isArray(response)
			? response
			: response.items;
		const transcriptions = Array.isArray(rawTranscriptions)
			? rawTranscriptions.filter(
					(transcription): transcription is IDataObject =>
						typeof transcription === 'object' && transcription !== null,
				)
			: [];

		if (transcriptions.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				`No transcriptions found for file ID: ${fileId}. Make sure the transcription has been created.`,
				{ itemIndex: i },
			);
		}

		// Return the latest transcription (or all if multiple)
		transcriptions.forEach((transcription) => {
			returnData.push({ json: transcription, pairedItem: { item: i } });
		});
	} else if (operation === 'list' || operation === 'getAll') {
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

		const transcriptions = Array.isArray(responseData)
			? responseData
			: Array.isArray(responseData.transcriptions)
				? responseData.transcriptions
				: [];
		transcriptions.forEach((transcription) => {
			if (typeof transcription === 'object' && transcription !== null) {
				returnData.push({
					json: transcription as IDataObject,
					pairedItem: { item: i },
				});
			}
		});
	}

	return returnData;
}
