import { describe, expect, it } from 'vitest';
import { validateLocalLimits } from '../../nodes/Soniox/limits';

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
});
