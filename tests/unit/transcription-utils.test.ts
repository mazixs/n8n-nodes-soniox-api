import { describe, expect, it } from 'vitest';
import {
	getTranscriptionFailureMessage,
	isTerminalTranscriptionFailure,
} from '../../nodes/Soniox/transcriptionUtils';

describe('transcription status utilities', () => {
	it('recognizes current and legacy terminal failure statuses', () => {
		expect(isTerminalTranscriptionFailure('failed')).toBe(true);
		expect(isTerminalTranscriptionFailure('error')).toBe(true);
		expect(isTerminalTranscriptionFailure('processing')).toBe(false);
	});

	it('formats structured asynchronous failure details', () => {
		expect(
			getTranscriptionFailureMessage({
				status: 'failed',
				error_type: 'file_download_failed',
				error_message: 'The source file could not be downloaded',
				request_id: 'req_456',
			}),
		).toBe(
			'The source file could not be downloaded (error_type: file_download_failed; Request ID: req_456)',
		);
	});
});
