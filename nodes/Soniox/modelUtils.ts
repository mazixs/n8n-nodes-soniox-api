export interface ModelOption {
	name: string;
	value: string;
}

interface ModelRecord {
	id?: unknown;
	model_id?: unknown;
	name?: unknown;
	display_name?: unknown;
	displayName?: unknown;
	value?: unknown;
	models?: unknown;
	items?: unknown;
}

function asRecord(value: unknown): ModelRecord {
	return typeof value === 'object' && value !== null
		? (value as ModelRecord)
		: {};
}

export function normalizeModelOptions(response: unknown): ModelOption[] {
	const responseRecord = asRecord(response);
	const rawModels = Array.isArray(response)
		? response
		: (responseRecord.models ?? responseRecord.items ?? []);
	if (!Array.isArray(rawModels)) return [];

	const seen = new Set<string>();
	const models: ModelOption[] = [];
	for (const rawModel of rawModels) {
		if (typeof rawModel === 'string') {
			const value = rawModel.trim();
			if (value && !seen.has(value)) {
				seen.add(value);
				models.push({ name: value, value });
			}
			continue;
		}
		const model = asRecord(rawModel);
		const value = String(
			model.id ?? model.model_id ?? model.name ?? model.value ?? '',
		).trim();
		if (!value || seen.has(value)) continue;
		seen.add(value);
		const displayName =
			String(
				model.display_name ?? model.displayName ?? model.name ?? value,
			).trim() || value;
		models.push({ name: displayName, value });
	}

	return models;
}

export function filterAsyncModels(models: ModelOption[]): ModelOption[] {
	return models.filter(
		({ value }) => !/(?:stt-rt|realtime|real-time)/i.test(value),
	);
}
