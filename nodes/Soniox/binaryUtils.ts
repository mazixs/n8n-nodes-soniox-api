export function createFileFormData(
	data: Uint8Array,
	filename: string,
	mimeType: string,
): FormData {
	const formData = new FormData();
	const blob = new Blob([data as unknown as ArrayBuffer], { type: mimeType });
	formData.append('file', blob, filename);
	return formData;
}
