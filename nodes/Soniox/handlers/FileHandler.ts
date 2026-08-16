import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import {
	sonioxApiRequest,
	sonioxApiRequestAllItems,
} from '../GenericFunctions';
import { createFileFormData } from '../binaryUtils';
import { CONTENT_TYPES } from '../constants';
import {
	BinaryMetadata,
	parseLocalLimitOptions,
	validateLocalLimits,
} from '../limits';

export async function fileHandler(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	if (operation === 'upload') {
		// 1. Получить параметры
		const binaryPropertyName = this.getNodeParameter(
			'binaryPropertyName',
			i,
		) as string;
		const fileName = this.getNodeParameter('fileName', i, '') as string;
		const limits = parseLocalLimitOptions(
			this.getNodeParameter('limits', i, {}),
		);

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

		// MIME Type Validation (Pre-flight)
		const mimeType = binaryData.mimeType;
		if (
			mimeType &&
			!mimeType.startsWith('audio/') &&
			!mimeType.startsWith('video/')
		) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid file type: ${mimeType}. Only audio and video files are supported (e.g., audio/mp3, video/mp4).`,
				{ itemIndex: i },
		);
	}

	// Reject known metadata limits before materializing the binary buffer.
	validateLocalLimits(binaryData as unknown as BinaryMetadata, limits);

	// The modern n8n HTTP helper accepts the platform FormData implementation.
		const buffer = await this.helpers.getBinaryDataBuffer(
			i,
			binaryPropertyName,
		);
		validateLocalLimits(
			{
				...(binaryData as unknown as BinaryMetadata),
				fileSize: buffer.length,
			},
			limits,
		);

		// 4. Определить имя файла
		const uploadFileName = fileName || binaryData.fileName || 'file';

		// 5. Подготовить formData для multipart/form-data
		const formData = createFileFormData(
			buffer,
			uploadFileName,
			binaryData.mimeType || CONTENT_TYPES.BINARY,
		);

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
		// API returns 'id' (not 'file_id')
		const fileId = String(response.id ?? response.file_id ?? '');
		if (!fileId) {
			throw new NodeOperationError(
				this.getNode(),
				'File upload failed: Soniox did not return a file ID.',
				{
					itemIndex: i,
				},
			);
		}
		returnData.push({
			json: {
				// Convenient fields for easy access
				fileId,
				file_id: fileId, // Alternative name for compatibility
				fileName: uploadFileName,
				mimeType: binaryData.mimeType,
				fileSize: binaryData.fileSize,
				uploadedAt: new Date().toISOString(),
				// Full API response
				...response,
			},
			pairedItem: { item: i },
		});
	} else if (operation === 'get') {
		const fileId = this.getNodeParameter('fileId', i) as string;

		const response = await sonioxApiRequest.call(
			this,
			'GET',
			`/files/${encodeURIComponent(fileId)}`,
		);

		returnData.push({ json: response, pairedItem: { item: i } });
	} else if (operation === 'list' || operation === 'getAll') {
		// Support both 'list' (new) and 'getAll' (deprecated) for backward compatibility
		const returnAll = this.getNodeParameter('returnAll', i);

		let responseData;
		if (returnAll) {
			responseData = await sonioxApiRequestAllItems.call(this, 'GET', '/files');
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

		const fileItems = Array.isArray(responseData)
			? responseData
			: Array.isArray(responseData.files)
				? responseData.files
				: [];
		fileItems.forEach((item: IDataObject) => {
			if (typeof item === 'object' && item !== null)
				returnData.push({ json: item, pairedItem: { item: i } });
		});
	} else if (operation === 'delete') {
		const fileId = this.getNodeParameter('fileId', i) as string;

		await sonioxApiRequest.call(
			this,
			'DELETE',
			`/files/${encodeURIComponent(fileId)}`,
		);

		returnData.push({
			json: {
				success: true,
				fileId,
			},
			pairedItem: { item: i },
		});
	}

	return returnData;
}
