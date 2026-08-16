import { describe, expect, it } from 'vitest';
import { Soniox } from '../../nodes/Soniox/Soniox.node';
import { transcriptionFields, transcriptionOperations } from '../../nodes/Soniox/descriptions/TranscriptionDescription';

function operationValues(): string[] {
	const operation = transcriptionOperations.find((field) => field.name === 'operation');
	return operation?.options?.map((option) => String(option.value)) ?? [];
}

describe('Soniox node metadata', () => {
	it('puts supported operations before legacy aliases without changing values', () => {
		expect(operationValues()).toEqual([
			'transcribe',
			'createJob',
			'get',
			'getTranscript',
			'list',
			'create',
			'createAndWait',
			'getByFile',
		]);
	});

	it('exposes structured context editors and the job lifecycle fields', () => {
		const names = transcriptionFields.map((field) => field.name);
		const additionalFields = transcriptionFields.find(
			(field) => field.name === 'additionalFields',
		);
		const additionalFieldNames =
			additionalFields?.options?.map((field) => String(field.name)) ?? [];

		expect(names).toEqual(
			expect.arrayContaining([
				'jobSource',
				'fileUrl',
				'fileId',
				'transcriptionId',
			]),
		);
		expect(additionalFieldNames).toEqual(
			expect.arrayContaining([
				'contextGeneralUi',
				'contextTranslationTermsUi',
			]),
		);

		const transcriptionId = transcriptionFields.find(
			(field) => field.name === 'transcriptionId',
		);
		expect(
			transcriptionFields.filter((field) => field.name === 'transcriptionId'),
		).toHaveLength(1);
		expect(transcriptionId?.displayOptions?.show?.operation).toEqual(
			expect.arrayContaining(['get', 'getTranscript']),
		);
	});

	it('uses a human-readable subtitle and points to node documentation', () => {
		const node = new Soniox().description;

		expect(node.subtitle).toContain('Transcribe audio');
		expect(node.documentationUrl).toBe(
			'https://github.com/mazixs/n8n-nodes-soniox-api#readme',
		);
	});

});
