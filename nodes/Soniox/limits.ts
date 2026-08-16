export interface LocalLimitOptions {
	maxFileSizeMb?: number;
	maxFileDurationMinutes?: number;
}

export interface BinaryMetadata {
	fileSize?: number | string;
	size?: number | string;
	sizeBytes?: number | string;
	durationMs?: number | string;
	audioDurationMs?: number | string;
	durationSeconds?: number | string;
	duration?: number | string;
}

export const SONIOX_MAX_FILE_DURATION_MINUTES = 300;

function toFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

export function parseLocalLimitOptions(value: unknown): LocalLimitOptions {
	if (typeof value !== 'object' || value === null || Array.isArray(value))
		return {};
	const limits = value as Record<string, unknown>;
	const maxFileSizeMb = toFiniteNumber(limits.maxFileSizeMb);
	const maxFileDurationMinutes = toFiniteNumber(limits.maxFileDurationMinutes);
	return {
		maxFileSizeMb:
			maxFileSizeMb !== undefined && maxFileSizeMb > 0
				? maxFileSizeMb
				: undefined,
		maxFileDurationMinutes:
			maxFileDurationMinutes !== undefined && maxFileDurationMinutes > 0
				? maxFileDurationMinutes
				: undefined,
	};
}

export function getBinarySizeBytes(
	metadata: BinaryMetadata,
): number | undefined {
	for (const value of [metadata.fileSize, metadata.sizeBytes, metadata.size]) {
		const parsed = toFiniteNumber(value);
		if (parsed !== undefined && parsed >= 0) return parsed;
	}
	return undefined;
}

export function getDurationMinutes(
	metadata: BinaryMetadata,
): number | undefined {
	for (const value of [metadata.durationMs, metadata.audioDurationMs]) {
		const parsed = toFiniteNumber(value);
		if (parsed !== undefined && parsed >= 0) return parsed / 60_000;
	}

	for (const value of [metadata.durationSeconds, metadata.duration]) {
		const parsed = toFiniteNumber(value);
		if (parsed !== undefined && parsed >= 0) return parsed / 60;
	}

	return undefined;
}

export function validateLocalLimits(
	metadata: BinaryMetadata,
	limits: LocalLimitOptions,
): void {
	const maxFileSizeMb = toFiniteNumber(limits.maxFileSizeMb);
	const maxFileDurationMinutes = toFiniteNumber(limits.maxFileDurationMinutes);

	if (maxFileSizeMb !== undefined && maxFileSizeMb <= 0) {
		throw new Error('Maximum file size must be greater than 0 MB.');
	}

	if (maxFileDurationMinutes !== undefined) {
		if (maxFileDurationMinutes <= 0) {
			throw new Error('Maximum file duration must be greater than 0 minutes.');
		}
		if (maxFileDurationMinutes > SONIOX_MAX_FILE_DURATION_MINUTES) {
			throw new Error(
				`Maximum file duration cannot exceed ${SONIOX_MAX_FILE_DURATION_MINUTES} minutes.`,
			);
		}
	}

	const sizeBytes = getBinarySizeBytes(metadata);
	if (
		maxFileSizeMb !== undefined &&
		sizeBytes !== undefined &&
		sizeBytes > maxFileSizeMb * 1024 * 1024
	) {
		throw new Error(
			`The file is larger than the configured maximum file size of ${maxFileSizeMb} MB.`,
		);
	}

	const durationMinutes = getDurationMinutes(metadata);
	if (
		durationMinutes !== undefined &&
		durationMinutes > SONIOX_MAX_FILE_DURATION_MINUTES
	) {
		throw new Error(
			`The file duration exceeds Soniox's maximum of ${SONIOX_MAX_FILE_DURATION_MINUTES} minutes.`,
		);
	}
	if (
		maxFileDurationMinutes !== undefined &&
		durationMinutes !== undefined &&
		durationMinutes > maxFileDurationMinutes
	) {
		throw new Error(
			`The file is longer than the configured maximum file duration of ${maxFileDurationMinutes} minutes.`,
		);
	}
}
