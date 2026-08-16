import { IDataObject } from 'n8n-workflow';

export function isTerminalTranscriptionFailure(status: string): boolean {
	return status === 'failed' || status === 'error';
}

export function getTranscriptionFailureMessage(response: IDataObject): string {
	const message = String(
		response.error_message ??
			response.message ??
			response.error_type ??
			'Unknown error',
	);
	const errorType = response.error_type
		? `; error_type: ${String(response.error_type)}`
		: '';
	const requestId = response.request_id
		? `; Request ID: ${String(response.request_id)}`
		: '';
	const details = `${errorType}${requestId}`.replace(/^; /, '');
	return details ? `${message} (${details})` : message;
}
