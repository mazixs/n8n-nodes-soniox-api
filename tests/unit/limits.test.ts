import { describe, expect, it } from 'vitest';
import {
	getBinarySizeBytes,
	getDurationMinutes,
	parseLocalLimitOptions,
	validateLocalLimits,
} from '../../nodes/Soniox/limits';

describe('local Soniox file limits', () => {
	it('does nothing when no local limits are configured', () => {
		expect(() => validateLocalLimits({ fileSize: '1024' }, {})).not.toThrow();
	});

	it('rejects a binary file larger than the configured maximum', () => {
		expect(() =>
			validateLocalLimits({ fileSize: 6 * 1024 * 1024 }, { maxFileSizeMb: 5 }),
		).toThrow(/configured maximum file size of 5 MB/i);
	});

	it('rejects known duration above the configured maximum', () => {
		expect(() =>
			validateLocalLimits(
				{ durationMs: 61 * 60 * 1000 },
				{ maxFileDurationMinutes: 60 },
			),
		).toThrow(/configured maximum file duration of 60 minutes/i);
	});

	it('does not reject duration when the input has no duration metadata', () => {
		expect(() =>
			validateLocalLimits(
				{ mimeType: 'audio/mpeg' },
				{ maxFileDurationMinutes: 60 },
			),
		).not.toThrow();
	});

	it('does not allow a configured duration limit above Soniox hard maximum', () => {
		expect(() =>
			validateLocalLimits({ duration: 10 }, { maxFileDurationMinutes: 301 }),
		).toThrow(/cannot exceed 300 minutes/i);
	});

	it('normalizes optional local limits and binary metadata variants', () => {
		expect(
			parseLocalLimitOptions({ maxFileSizeMb: '25', maxFileDurationMinutes: 60 }),
		).toEqual({ maxFileSizeMb: 25, maxFileDurationMinutes: 60 });
		expect(parseLocalLimitOptions(['invalid'])).toEqual({});
		expect(parseLocalLimitOptions({ maxFileSizeMb: 0 })).toEqual({
		maxFileSizeMb: undefined,
		maxFileDurationMinutes: undefined,
	});
		expect(getBinarySizeBytes({ sizeBytes: '2048' })).toBe(2048);
		expect(getBinarySizeBytes({ size: -1 })).toBeUndefined();
		expect(getDurationMinutes({ audioDurationMs: '60000' })).toBe(1);
		expect(getDurationMinutes({ durationSeconds: 120 })).toBe(2);
		expect(getDurationMinutes({ duration: -1 })).toBeUndefined();
	});

	it('rejects invalid and hard-limit metadata before upload', () => {
		expect(() =>
			validateLocalLimits({}, { maxFileSizeMb: 0 }),
		).toThrow(/file size must be greater than 0/i);
		expect(() =>
			validateLocalLimits({}, { maxFileDurationMinutes: 0 }),
		).toThrow(/file duration must be greater than 0/i);
		expect(() =>
			validateLocalLimits({ durationSeconds: 18_100 }, {}),
		).toThrow(/maximum of 300 minutes/i);
		expect(() =>
			validateLocalLimits({ durationSeconds: 120 }, { maxFileDurationMinutes: 1 }),
		).toThrow(/configured maximum file duration of 1 minutes/i);
	});
});
