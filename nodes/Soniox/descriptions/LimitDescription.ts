import { INodeProperties } from 'n8n-workflow';

export const localLimitsField: INodeProperties = {
	displayName: 'Limits',
	name: 'limits',
	type: 'collection',
	placeholder: 'Add Limit',
	default: {},
	description:
		'Optional local checks. Soniox remains authoritative for account quotas. Set a value to 0 to disable that check.',
	options: [
		{
			displayName: 'Maximum File Duration (Minutes)',
			name: 'maxFileDurationMinutes',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
				maxValue: 300,
			},
			description:
				'Reject a file when duration metadata is available and exceeds this value. Soniox has a hard maximum of 300 minutes.',
		},
		{
			displayName: 'Maximum File Size (MB)',
			name: 'maxFileSizeMb',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
			},
			description:
				'Reject a binary file before upload when its size exceeds this value. The account-specific Soniox byte limit may be lower.',
		},
	],
};
