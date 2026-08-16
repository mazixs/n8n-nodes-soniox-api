import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { sonioxApiRequest } from '../GenericFunctions';

export async function modelHandler(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	if (operation === 'getAll') {
		const response = await sonioxApiRequest.call(this, 'GET', '/models');

		const models = Array.isArray(response)
			? response
			: Array.isArray(response.models)
				? response.models
				: [];
		models.forEach((model) => {
			if (typeof model === 'object' && model !== null) {
				returnData.push({
					json: model as IDataObject,
					pairedItem: { item: i },
				});
			}
		});
	}

	return returnData;
}
