import { IDataObject } from 'n8n-workflow';

type ContextEntry = Record<string, unknown>;

export class ContextValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContextValidationError';
	}
}

function asRecord(value: unknown): ContextEntry | undefined {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as ContextEntry)
		: undefined;
}

function parseLegacyEntries(
	value: unknown,
	label: string,
	firstKey: string,
	secondKey: string,
): IDataObject[] | undefined {
	if (typeof value !== 'string' || value.trim() === '') return undefined;

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error -- this pure helper has no n8n node context
		throw new ContextValidationError(`${label} must contain valid JSON.`);
	}

	return validateEntries(parsed, label, firstKey, secondKey);
}

function readStructuredEntries(
	value: unknown,
	collectionKey: string,
	label: string,
	firstKey: string,
	secondKey: string,
): IDataObject[] | undefined {
	const collection = asRecord(value);
	if (!collection || collection[collectionKey] === undefined) return undefined;

	const entries = collection[collectionKey];
	return validateEntries(entries, label, firstKey, secondKey);
}

function validateEntries(
	value: unknown,
	label: string,
	firstKey: string,
	secondKey: string,
): IDataObject[] | undefined {
	if (value === undefined || value === null) return undefined;

	const entries = Array.isArray(value) ? value : [value];
	if (entries.length === 0) return undefined;

	return entries.map((entry, index) => {
		const record = asRecord(entry);
		const first = record?.[firstKey];
		const second = record?.[secondKey];
		if (
			typeof first !== 'string' ||
			first.trim() === '' ||
			typeof second !== 'string' ||
			second.trim() === ''
		) {
			throw new ContextValidationError(
				`${label} entries require both ${firstKey} and ${secondKey} (entry ${index + 1}).`,
			);
		}

		return {
			[firstKey]: first.trim(),
			[secondKey]: second.trim(),
		};
	});
}

/**
 * Builds the Soniox context object from legacy JSON or structured UI fields.
 * Both representations remain readable for saved workflows, but mixing them
 * is rejected so that the request never has an ambiguous source of truth.
 */
export function buildContextObject(
	additionalFields: IDataObject,
): IDataObject | undefined {
	const legacyGeneral = parseLegacyEntries(
		additionalFields.contextGeneral,
		'Context General',
		'key',
		'value',
	);
	const structuredGeneral = readStructuredEntries(
		additionalFields.contextGeneralUi,
		'generalValues',
		'Context General',
		'key',
		'value',
	);

	if (legacyGeneral && structuredGeneral) {
		throw new ContextValidationError(
			'Use either the legacy JSON or structured editor for Context General, not both.',
		);
	}

	const legacyTranslationTerms = parseLegacyEntries(
		additionalFields.contextTranslationTerms,
		'Context Translation Terms',
		'source',
		'target',
	);
	const structuredTranslationTerms = readStructuredEntries(
		additionalFields.contextTranslationTermsUi,
		'translationTermValues',
		'Context Translation Terms',
		'source',
		'target',
	);

	if (legacyTranslationTerms && structuredTranslationTerms) {
		throw new ContextValidationError(
			'Use either the legacy JSON or structured editor for Context Translation Terms, not both.',
		);
	}

	const general = structuredGeneral ?? legacyGeneral;
	const translationTerms =
		structuredTranslationTerms ?? legacyTranslationTerms;
	const context: IDataObject = {};
	let hasContext = false;

	if (general) {
		context.general = general;
		hasContext = true;
	}
	if (additionalFields.contextText) {
		const text = String(additionalFields.contextText).trim();
		if (text.length > 0) {
			context.text = text;
			hasContext = true;
		}
	}
	if (additionalFields.contextTerms) {
		const terms = String(additionalFields.contextTerms)
			.split(',')
			.map((term) => term.trim())
			.filter((term) => term.length > 0);
		if (terms.length > 0) {
			context.terms = terms;
			hasContext = true;
		}
	}
	if (translationTerms) {
		context.translation_terms = translationTerms;
		hasContext = true;
	}

	return hasContext ? context : undefined;
}

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
