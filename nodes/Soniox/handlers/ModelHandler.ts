import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { sonioxApiRequest } from '../GenericFunctions';

export async function modelHandler(
	this: IExecuteFunctions,
	operation: string,
	_i: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

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

	return returnData;
}
