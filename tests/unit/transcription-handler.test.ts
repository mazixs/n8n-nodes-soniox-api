import { describe, expect, it, vi } from 'vitest';
import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { transcriptionHandler } from '../../nodes/Soniox/handlers/TranscriptionHandler';

function createContext(
	parameters: Record<string, unknown>,
	responses: unknown[],
	input: Record<string, unknown> = {},
) {
	const requests: IHttpRequestOptions[] = [];
	const request = vi.fn(
		async (_credentialType: string, options: IHttpRequestOptions) => {
			requests.push(options);
			const response = responses.shift();
			if (response instanceof Error) throw response;
			return response ?? {};
		},
	);
	const context = {
		getInputData: vi.fn(() => [input]),
		getNodeParameter: vi.fn(
			(name: string, _index: number, defaultValue?: unknown) =>
				parameters[name] ?? defaultValue,
		),
		getCredentials: vi.fn(async () => ({
			apiUrl: 'https://api.soniox.com/v1',
		})),
		getNode: vi.fn(() => ({ name: 'Soniox' })),
		helpers: {
			httpRequestWithAuthentication: request,
			getBinaryDataBuffer: vi.fn(async () => Buffer.from('audio-data')),
		},
	} as unknown as IExecuteFunctions;

	return { context, requests };
}

describe('Soniox transcription job lifecycle', () => {
	it('creates a job from binary input without polling or deleting the file', async () => {
		const { context, requests } = createContext(
			{
				jobSource: 'binary',
				binaryPropertyName: 'data',
				model: 'stt-async-v5',
				additionalFields: {},
				options: {},
			},
			[
				{ id: 'file-123' },
				{ id: 'transcription-123', status: 'queued' },
			],
			{
				binary: {
					data: {
						fileName: 'meeting.mp3',
						fileExtension: 'mp3',
						mimeType: 'audio/mpeg',
					},
				},
			},
		);

		const result = await transcriptionHandler.call(context, 'createJob', 0);

		expect(requests).toHaveLength(2);
		expect(requests[0]).toMatchObject({
			method: 'POST',
			url: 'https://api.soniox.com/v1/files',
		});
		expect(requests[1]).toMatchObject({
			method: 'POST',
			url: 'https://api.soniox.com/v1/transcriptions',
			body: { model: 'stt-async-v5', file_id: 'file-123' },
		});
		expect(result).toEqual([
			{
				json: {
					id: 'transcription-123',
					status: 'queued',
					transcriptionId: 'transcription-123',
					fileId: 'file-123',
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('creates a job from a public URL without uploading binary data', async () => {
		const { context, requests } = createContext(
			{
				jobSource: 'url',
				fileUrl: 'https://example.com/audio.mp3',
				model: 'stt-async-v5',
				additionalFields: {},
				options: {},
			},
			[{ transcription_id: 'transcription-url', status: 'queued' }],
		);

		const result = await transcriptionHandler.call(context, 'createJob', 0);

		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({
			method: 'POST',
			url: 'https://api.soniox.com/v1/transcriptions',
			body: {
				model: 'stt-async-v5',
				audio_url: 'https://example.com/audio.mp3',
			},
		});
		expect(result[0].json).toMatchObject({
			transcriptionId: 'transcription-url',
		});
	});

	it('creates a job for an existing file ID without uploading again', async () => {
		const { context, requests } = createContext(
			{
				jobSource: 'fileId',
				fileId: 'file-existing',
				model: 'stt-async-v5',
				additionalFields: {},
				options: {},
			},
			[{ id: 'transcription-existing', status: 'queued' }],
		);

		await transcriptionHandler.call(context, 'createJob', 0);

		expect(requests).toHaveLength(1);
		expect(requests[0].body).toEqual({
			model: 'stt-async-v5',
			file_id: 'file-existing',
		});
	});

	it('gets a completed transcript without starting a polling loop', async () => {
		const { context, requests } = createContext(
			{ transcriptionId: 'transcription-456' },
			[{ text: 'Meeting transcript' }],
		);

		const result = await transcriptionHandler.call(context, 'getTranscript', 0);

		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({
			method: 'GET',
			url: 'https://api.soniox.com/v1/transcriptions/transcription-456/transcript',
		});
		expect(result[0].json).toEqual({
			text: 'Meeting transcript',
			transcriptionId: 'transcription-456',
		});
	});

	it('explains that a transcript is not ready when Soniox returns 409', async () => {
		const { context } = createContext(
			{ transcriptionId: 'transcription-pending' },
			[
				Object.assign(new Error('Transcription is not complete'), {
					statusCode: 409,
					response: {
						body: { error_message: 'Transcription is not complete' },
					},
				}),
			],
		);

		await expect(
			transcriptionHandler.call(context, 'getTranscript', 0),
		).rejects.toThrow(/is not complete yet/i);
	});

	it('transcribes a URL with structured options, diarization and cleanup', async () => {
		const tokens = [
			{ speaker: '1', text: 'Hello ', start_ms: 0, end_ms: 500 },
			{ speaker: '1', text: 'world', start_ms: 500, end_ms: 900 },
			{ speaker: '2', text: 'Hi', start_ms: 1000, end_ms: 1300 },
		];
		const { context, requests } = createContext(
			{
				source: 'url',
				fileUrl: 'https://example.com/meeting.mp3',
				model: 'stt-async-v5',
				additionalFields: {
					languageHints: 'en, de',
					languageHintsStrict: true,
					contextGeneralUi: {
						generalValues: [{ key: 'meeting', value: 'weekly sync' }],
					},
					translationType: 'one_way',
					targetLanguage: 'de',
					enableSpeakerDiarization: true,
					enableLanguageIdentification: true,
					webhookUrl: 'https://example.com/webhook',
					webhookAuthHeaderName: 'X-Workflow',
					webhookAuthHeaderValue: 'safe-value',
					clientReferenceId: 'workflow-1',
				},
				options: {
					deleteAudioFile: false,
					deleteTranscription: true,
					includeTokens: true,
					maxWaitTime: 1,
				},
			},
			[
				{ transcription_id: 'tr-url' },
				{ status: 'completed', duration_ms: 1300 },
				{ text: 'Hello world Hi', tokens },
				{},
			],
		);

		const result = await transcriptionHandler.call(context, 'transcribe', 0);

		expect(result[0].json).toMatchObject({
			status: 'completed',
			text: 'Hello world Hi',
			tokens,
			speakers: [
				{ speaker: '1', text: 'Hello world', start_ms: 0, end_ms: 900 },
				{ speaker: '2', text: 'Hi', start_ms: 1000, end_ms: 1300 },
			],
		});
		expect(requests[0].body).toMatchObject({
			model: 'stt-async-v5',
			audio_url: 'https://example.com/meeting.mp3',
			language_hints: ['en', 'de'],
			language_hints_strict: true,
			translation: { type: 'one_way', target_language: 'de' },
			webhook_url: 'https://example.com/webhook',
			client_reference_id: 'workflow-1',
		});
		expect(requests.at(-1)).toMatchObject({
			method: 'DELETE',
			url: 'https://api.soniox.com/v1/transcriptions/tr-url',
		});
	});

	it('transcribes binary input and deletes temporary resources by default', async () => {
		const { context, requests } = createContext(
			{
				source: 'binary',
				binaryPropertyName: 'data',
				model: 'stt-async-v5',
				additionalFields: {},
				options: { deleteTranscription: true },
			},
			[
				{ id: 'file-binary' },
				{ id: 'tr-binary' },
				{ status: 'completed' },
				{ text: 'Binary transcript' },
				{},
				{},
			],
			{
				binary: {
					data: { fileName: 'audio.mp3', mimeType: 'audio/mpeg' },
				},
			},
		);

		const result = await transcriptionHandler.call(context, 'transcribe', 0);

		expect(result[0].json).toMatchObject({ text: 'Binary transcript' });
		expect(requests.slice(-2).map(({ method, url }) => ({ method, url }))).toEqual([
			{ method: 'DELETE', url: 'https://api.soniox.com/v1/files/file-binary' },
			{
				method: 'DELETE',
				url: 'https://api.soniox.com/v1/transcriptions/tr-binary',
			},
		]);
	});

	it('reports failed and timed-out all-in-one transcriptions', async () => {
		const failed = createContext(
			{
				source: 'url',
				fileUrl: 'https://example.com/audio.mp3',
				model: 'stt-async-v5',
				additionalFields: {},
				options: {},
			},
			[{ id: 'tr-failed' }, { status: 'failed', error_message: 'Bad audio' }],
		);
		await expect(
			transcriptionHandler.call(failed.context, 'transcribe', 0),
		).rejects.toThrow(/Bad audio/);

		const timeout = createContext(
			{
				source: 'url',
				fileUrl: 'https://example.com/audio.mp3',
				model: 'stt-async-v5',
				additionalFields: {},
				options: { maxWaitTime: 0.1, checkInterval: 0.1 },
			},
			[{ id: 'tr-timeout' }, { status: 'queued' }],
		);
		await expect(
			transcriptionHandler.call(timeout.context, 'transcribe', 0),
		).rejects.toThrow(/timeout after/i);
	});

	it('rejects unsafe polling values before making status requests', async () => {
		const { context, requests } = createContext(
			{
				source: 'url',
				fileUrl: 'https://example.com/audio.mp3',
				model: 'stt-async-v5',
				additionalFields: {},
				options: { checkInterval: 0 },
			},
			[],
		);

		await expect(
			transcriptionHandler.call(context, 'transcribe', 0),
		).rejects.toThrow(/Check interval must be between/i);
		expect(requests).toHaveLength(0);
	});

	it('keeps the legacy create operation and sends its API options', async () => {
		const { context, requests } = createContext(
			{
				fileId: '123e4567-e89b-12d3-a456-426614174000',
				model: 'stt-async-v5',
				additionalFields: {
					languageHints: 'en,fr',
					translationType: 'two_way',
					languageA: 'en',
					languageB: 'fr',
					enableSpeakerDiarization: true,
				},
			},
			[{ transcription_id: 'tr-legacy' }],
		);

		const result = await transcriptionHandler.call(context, 'create', 0);

		expect(result[0].json).toEqual({ transcription_id: 'tr-legacy' });
		expect(requests[0].body).toMatchObject({
			file_id: '123e4567-e89b-12d3-a456-426614174000',
			model: 'stt-async-v5',
			language_hints: ['en', 'fr'],
			translation: { type: 'two_way', language_a: 'en', language_b: 'fr' },
			enable_speaker_diarization: true,
		});
	});

	it('validates legacy create identifiers and model values', async () => {
		const emptyFile = createContext(
			{ fileId: '', model: 'stt-async-v5', additionalFields: {} },
			[],
		);
		await expect(
			transcriptionHandler.call(emptyFile.context, 'create', 0),
		).rejects.toThrow(/File ID is required/i);

		const invalidUuid = createContext(
			{ fileId: 'file-1', model: 'stt-async-v5', additionalFields: {} },
			[],
		);
		await expect(
			transcriptionHandler.call(invalidUuid.context, 'create', 0),
		).rejects.toThrow(/valid UUID/i);

		const emptyModel = createContext(
			{
				fileId: '123e4567-e89b-12d3-a456-426614174000',
				model: '',
				additionalFields: {},
			},
			[],
		);
		await expect(
			transcriptionHandler.call(emptyModel.context, 'create', 0),
		).rejects.toThrow(/Model is required/i);
	});

	it('keeps the legacy createAndWait polling and cleanup behavior', async () => {
		const { context, requests } = createContext(
			{
				fileId: '123e4567-e89b-12d3-a456-426614174000',
				model: 'stt-async-v5',
				additionalFields: {},
				options: { maxWaitTime: 1, deleteTranscription: true },
			},
			[
				{ id: 'tr-wait' },
				{ status: 'completed' },
				{ text: 'Waited transcript' },
				{},
			],
		);

		const result = await transcriptionHandler.call(context, 'createAndWait', 0);

		expect(result[0].json).toEqual({ status: 'completed', text: 'Waited transcript' });
		expect(requests.at(-1)).toMatchObject({
			method: 'DELETE',
			url: 'https://api.soniox.com/v1/transcriptions/tr-wait',
		});
	});

	it('supports legacy status, file lookup and list aliases', async () => {
		const status = createContext({ transcriptionId: 'tr-1' }, [{ status: 'processing' }]);
		const statusResult = await transcriptionHandler.call(status.context, 'get', 0);
		expect(statusResult[0].json).toEqual({ status: 'processing' });

		const byFile = createContext(
			{ fileId: '123e4567-e89b-12d3-a456-426614174000' },
			[{ items: [{ id: 'tr-1' }, null, { id: 'tr-2' }] }],
		);
		const byFileResult = await transcriptionHandler.call(
			byFile.context,
			'getByFile',
			0,
		);
		expect(byFileResult.map(({ json }) => json)).toEqual([
			{ id: 'tr-1' },
			{ id: 'tr-2' },
		]);

		const list = createContext(
			{ returnAll: false, limit: 10 },
			[{ transcriptions: [{ id: 'tr-1' }, 'invalid'] }],
		);
		const listResult = await transcriptionHandler.call(list.context, 'list', 0);
		expect(listResult.map(({ json }) => json)).toEqual([{ id: 'tr-1' }]);

		const all = createContext(
			{ returnAll: true },
			[{ transcriptions: [{ id: 'tr-1' }], next_page_cursor: 'next' }, { transcriptions: [{ id: 'tr-2' }] }],
		);
		const allResult = await transcriptionHandler.call(all.context, 'getAll', 0);
		expect(allResult.map(({ json }) => json)).toEqual([{ id: 'tr-1' }, { id: 'tr-2' }]);
	});

	it('reports missing resources and empty file lookups', async () => {
		const emptyTranscript = createContext({ transcriptionId: '' }, []);
		await expect(
			transcriptionHandler.call(emptyTranscript.context, 'getTranscript', 0),
		).rejects.toThrow(/Transcription ID is required/i);

		const invalidFile = createContext({ fileId: 'file-1' }, []);
		await expect(
			transcriptionHandler.call(invalidFile.context, 'getByFile', 0),
		).rejects.toThrow(/valid UUID/i);

		const emptyLookup = createContext(
			{ fileId: '123e4567-e89b-12d3-a456-426614174000' },
			[[]],
		);
		await expect(
			transcriptionHandler.call(emptyLookup.context, 'getByFile', 0),
		).rejects.toThrow(/No transcriptions found/i);
	});

	it('deletes an uploaded file when context validation fails before job creation', async () => {
		const { context, requests } = createContext(
			{
				source: 'binary',
				binaryPropertyName: 'data',
				model: 'stt-async-v5',
				additionalFields: { contextGeneral: '{invalid-json' },
				options: {},
			},
			[{ id: 'file-context-error' }, {}],
			{ binary: { data: { fileName: 'audio.mp3', mimeType: 'audio/mpeg' } } },
		);

		await expect(
			transcriptionHandler.call(context, 'transcribe', 0),
		).rejects.toThrow(/Context General must contain valid JSON/i);
		expect(requests.at(-1)).toMatchObject({
			method: 'DELETE',
			url: 'https://api.soniox.com/v1/files/file-context-error',
		});
	});

	it('cleans up an uploaded file when Create Job cannot create the transcription', async () => {
		const { context, requests } = createContext(
			{
				jobSource: 'binary',
				binaryPropertyName: 'data',
				model: 'stt-async-v5',
				additionalFields: {},
				options: {},
			},
			[
				{ id: 'file-cleanup' },
				Object.assign(new Error('quota exceeded'), {
					statusCode: 429,
					body: {
						error_type: 'limit_exceeded',
						error_message: 'quota exceeded',
					},
				}),
				{},
			],
			{ binary: { data: { fileName: 'audio.mp3', mimeType: 'audio/mpeg' } } },
		);

		await expect(
			transcriptionHandler.call(context, 'createJob', 0),
		).rejects.toThrow(/quota exceeded/i);
		expect(requests.at(-1)).toMatchObject({
			method: 'DELETE',
			url: 'https://api.soniox.com/v1/files/file-cleanup',
		});
	});

	it('handles Create Job validation and upload failures before sending a job', async () => {
		const noModel = createContext(
			{ jobSource: 'url', fileUrl: 'https://example.com/a.mp3', model: '', options: {} },
			[],
		);
		await expect(
			transcriptionHandler.call(noModel.context, 'createJob', 0),
		).rejects.toThrow(/Model is required/i);

		const noUrl = createContext(
			{ jobSource: 'url', fileUrl: ' ', model: 'stt-async-v5', options: {} },
			[],
		);
		await expect(
			transcriptionHandler.call(noUrl.context, 'createJob', 0),
		).rejects.toThrow(/Audio URL is required/i);

		const noBinary = createContext(
			{
				jobSource: 'binary',
				binaryPropertyName: 'data',
				model: 'stt-async-v5',
				options: {},
			},
			[],
			{},
		);
		await expect(
			transcriptionHandler.call(noBinary.context, 'createJob', 0),
		).rejects.toThrow(/No binary data found/i);

		const noUploadId = createContext(
			{
				jobSource: 'binary',
				binaryPropertyName: 'data',
				model: 'stt-async-v5',
				options: {},
			},
			[{}],
			{ binary: { data: { mimeType: 'audio/mpeg' } } },
		);
		await expect(
			transcriptionHandler.call(noUploadId.context, 'createJob', 0),
		).rejects.toThrow(/did not return a file ID/i);
	});

	it('reports failed and timed-out legacy createAndWait jobs', async () => {
		const failed = createContext(
			{
				fileId: '123e4567-e89b-12d3-a456-426614174000',
				model: 'stt-async-v5',
				additionalFields: {},
				options: {},
			},
			[{ id: 'tr-failed' }, { status: 'failed', error_message: 'Legacy failure' }],
		);
		await expect(
			transcriptionHandler.call(failed.context, 'createAndWait', 0),
		).rejects.toThrow(/Legacy failure/i);

		const timeout = createContext(
			{
				fileId: '123e4567-e89b-12d3-a456-426614174000',
				model: 'stt-async-v5',
				additionalFields: {},
				options: { maxWaitTime: 0.1, checkInterval: 0.1 },
			},
			[{ id: 'tr-timeout' }, { status: 'queued' }],
		);
		await expect(
			transcriptionHandler.call(timeout.context, 'createAndWait', 0),
		).rejects.toThrow(/Timeout after/i);
	});
});
