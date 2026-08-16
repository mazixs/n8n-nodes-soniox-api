import { describe, expect, it, vi } from 'vitest';
import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { fileHandler } from '../../nodes/Soniox/handlers/FileHandler';

function createContext(
	parameters: Record<string, unknown>,
	responses: unknown[],
	input: Record<string, unknown> = {},
) {
	const requests: IHttpRequestOptions[] = [];
	const getBinaryDataBuffer = vi.fn(async () => Buffer.from('audio-data'));
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
			getBinaryDataBuffer,
		},
	} as unknown as IExecuteFunctions;

	return { context, requests, request, getBinaryDataBuffer };
}

const audioInput = {
	binary: {
		data: {
			fileName: 'meeting.mp3',
			fileExtension: 'mp3',
			mimeType: 'audio/mpeg',
		},
	},
};

describe('Soniox file handler', () => {
	it('uploads binary data and keeps the API response', async () => {
		const { context, requests } = createContext(
			{
				binaryPropertyName: 'data',
				fileName: '',
				limits: {},
			},
			[{ id: 'file-123', status: 'ready' }],
			audioInput,
		);

		const result = await fileHandler.call(context, 'upload', 0);

		expect(requests[0]).toMatchObject({
			method: 'POST',
			url: 'https://api.soniox.com/v1/files',
		});
		expect(requests[0].body).toBeInstanceOf(FormData);
		expect(result[0].json).toMatchObject({
			fileId: 'file-123',
			file_id: 'file-123',
			fileName: 'meeting.mp3',
			status: 'ready',
		});
	});

	it('uses an explicit upload name and rejects unsupported MIME types', async () => {
		const { context, requests } = createContext(
			{
				binaryPropertyName: 'data',
				fileName: 'custom.wav',
				limits: {},
			},
			[{ id: 'file-123' }],
			audioInput,
		);
		await fileHandler.call(context, 'upload', 0);
		expect(requests[0].body).toBeInstanceOf(FormData);

		const { context: invalidContext } = createContext(
			{ binaryPropertyName: 'data', fileName: '', limits: {} },
			[],
			{ binary: { data: { mimeType: 'application/pdf' } } },
		);
		await expect(fileHandler.call(invalidContext, 'upload', 0)).rejects.toThrow(
			/Only audio and video files are supported/i,
		);
	});

	it('reports missing binary properties and missing upload IDs', async () => {
		const { context } = createContext(
			{ binaryPropertyName: 'data', fileName: '', limits: {} },
			[],
			{},
		);
		await expect(fileHandler.call(context, 'upload', 0)).rejects.toThrow(
			/No binary data exists/i,
		);

		const { context: missingPropertyContext } = createContext(
			{ binaryPropertyName: 'audio', fileName: '', limits: {} },
			[],
			audioInput,
		);
		await expect(
			fileHandler.call(missingPropertyContext, 'upload', 0),
		).rejects.toThrow(/Binary property "audio" not found/i);

		const { context: noIdContext } = createContext(
			{ binaryPropertyName: 'data', fileName: '', limits: {} },
			[{}],
			audioInput,
		);
		await expect(fileHandler.call(noIdContext, 'upload', 0)).rejects.toThrow(
			/did not return a file ID/i,
		);
	});

	it('checks known metadata limits before reading the binary buffer', async () => {
		const { context, getBinaryDataBuffer, requests } = createContext(
			{
				binaryPropertyName: 'data',
				fileName: '',
				limits: { maxFileSizeMb: 1 },
			},
			[],
			{
				binary: {
					data: { fileSize: 2 * 1024 * 1024, mimeType: 'audio/mpeg' },
				},
			},
		);

		await expect(fileHandler.call(context, 'upload', 0)).rejects.toThrow(
			/configured maximum file size of 1 MB/i,
		);
		expect(getBinaryDataBuffer).not.toHaveBeenCalled();
		expect(requests).toHaveLength(0);
	});

	it('gets one file and deletes it with a compatibility-shaped result', async () => {
		const { context, requests } = createContext(
			{ fileId: 'file-123' },
			[{ id: 'file-123', status: 'ready' }],
		);
		const result = await fileHandler.call(context, 'get', 0);
		expect(result[0].json).toEqual({ id: 'file-123', status: 'ready' });
		expect(requests[0].url).toBe('https://api.soniox.com/v1/files/file-123');

		const deleteContext = createContext({ fileId: 'file-123' }, [{}]);
		const deleted = await fileHandler.call(deleteContext.context, 'delete', 0);
		expect(deleted[0].json).toEqual({ success: true, fileId: 'file-123' });
		expect(deleteContext.requests[0]).toMatchObject({
			method: 'DELETE',
			url: 'https://api.soniox.com/v1/files/file-123',
		});
	});

	it('lists paginated files and supports the legacy getAll alias', async () => {
		const { context, requests } = createContext(
			{ returnAll: false, limit: 2 },
			[{ files: [{ id: 'file-1' }, { id: 'file-2' }, 'invalid'] }],
		);
		const result = await fileHandler.call(context, 'list', 0);
		expect(result.map(({ json }) => json)).toEqual([
			{ id: 'file-1' },
			{ id: 'file-2' },
		]);
		expect(requests[0].qs).toEqual({ limit: 2 });

		const allContext = createContext(
			{ returnAll: true },
			[{ files: [{ id: 'file-1' }], next_page_cursor: 'next' }, { files: [{ id: 'file-2' }] }],
		);
		const all = await fileHandler.call(allContext.context, 'getAll', 0);
		expect(all.map(({ json }) => json)).toEqual([
			{ id: 'file-1' },
			{ id: 'file-2' },
		]);
		expect(allContext.requests).toHaveLength(2);
	});
});
