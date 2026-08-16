import { describe, expect, it } from 'vitest';
import { fileOperations } from '../../nodes/Soniox/descriptions/FileDescription';
import { transcriptionOperations } from '../../nodes/Soniox/descriptions/TranscriptionDescription';

function operationValues(operations: typeof fileOperations): string[] {
	const operation = operations.find((field) => field.name === 'operation');
	return operation?.options?.map((option) => String(option.value)) ?? [];
}

describe('workflow compatibility metadata', () => {
	it('keeps file operation aliases used by older workflows', () => {
		expect(operationValues(fileOperations)).toEqual(
			expect.arrayContaining(['upload', 'get', 'getAll', 'list', 'delete']),
		);
	});

	it('keeps deprecated transcription operation values while exposing modern ones', () => {
		expect(operationValues(transcriptionOperations)).toEqual(
			expect.arrayContaining([
				'create',
				'createAndWait',
				'getByFile',
				'get',
				'list',
				'transcribe',
			]),
		);
	});
});
