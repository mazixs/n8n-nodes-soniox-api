import { describe, expect, it } from 'vitest';
import {
	buildContextObject,
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

	it('builds Soniox context from structured editor fields', () => {
		expect(
			buildContextObject({
				contextGeneralUi: {
					generalValues: [
						{ key: 'domain', value: 'healthcare' },
						{ key: 'topic', value: 'consultation' },
					],
				},
				contextTranslationTermsUi: {
					translationTermValues: [
						{ source: 'MRI', target: 'RM' },
					],
				},
			}),
		).toEqual({
			general: [
				{ key: 'domain', value: 'healthcare' },
				{ key: 'topic', value: 'consultation' },
			],
			translation_terms: [{ source: 'MRI', target: 'RM' }],
		});
	});

	it('keeps valid legacy JSON context values compatible', () => {
		expect(
			buildContextObject({
				contextGeneral: '[{"key":"domain","value":"healthcare"}]',
				contextTranslationTerms: '[{"source":"MRI","target":"RM"}]',
			}),
		).toEqual({
			general: [{ key: 'domain', value: 'healthcare' }],
			translation_terms: [{ source: 'MRI', target: 'RM' }],
		});
	});

	it('rejects malformed legacy JSON instead of silently dropping context', () => {
		expect(() =>
			buildContextObject({ contextGeneral: '{invalid-json' }),
		).toThrow(/Context General must contain valid JSON/i);
	});

	it('rejects incomplete structured context entries', () => {
		expect(() =>
			buildContextObject({
				contextGeneralUi: {
					generalValues: [{ key: '', value: 'healthcare' }],
				},
			}),
		).toThrow(/Context General entries require both key and value/i);
	});

	it('rejects mixing legacy and structured context representations', () => {
		expect(() =>
			buildContextObject({
				contextGeneral: '[{"key":"domain","value":"healthcare"}]',
				contextGeneralUi: {
					generalValues: [{ key: 'topic', value: 'consultation' }],
				},
			}),
		).toThrow(/Use either the legacy JSON or structured editor/i);
	});

	it('keeps text and comma-separated context terms in the API shape', () => {
		expect(
			buildContextObject({
				contextText: '  domain context  ',
				contextTerms: ' one, two ,, three ',
			}),
		).toEqual({ text: 'domain context', terms: ['one', 'two', 'three'] });
		expect(buildContextObject({ contextText: '  ', contextTerms: ' , ' })).toBeUndefined();
	});

	it('supports a single structured entry and validates translation terms', () => {
		expect(
			buildContextObject({
				contextGeneralUi: { generalValues: { key: 'topic', value: 'support' } },
				contextTranslationTermsUi: {
					translationTermValues: { source: 'hello', target: 'привет' },
				},
			}),
		).toEqual({
			general: [{ key: 'topic', value: 'support' }],
			translation_terms: [{ source: 'hello', target: 'привет' }],
		});
		 expect(() =>
			buildContextObject({
				contextTranslationTerms: '[{"source":"hello"}]',
			}),
		).toThrow(/translation terms entries require both source and target/i);
	});
});
