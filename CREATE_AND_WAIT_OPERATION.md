# Как добавить операцию Create and Wait

## Готовый код

Добавьте этот код в файл `nodes/Soniox/Soniox.node.ts` ПОСЛЕ операции `create` (после строки 331) и ПЕРЕД операцией `get` (перед строкой 334):

```typescript
else if (operation === 'createAndWait') {
    const fileId = this.getNodeParameter('fileId', i) as string;
    const model = this.getNodeParameter('model', i, '') as string;
    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
    const options = this.getNodeParameter('options', i, {}) as IDataObject;

    const maxWaitTime = (options.maxWaitTime as number) || 300;
    const checkInterval = (options.checkInterval as number) || 5;

    // Validate fileId (must be UUID)
    if (!fileId || !fileId.trim()) {
        throw new NodeOperationError(
            this.getNode(),
            'File ID is required',
            { itemIndex: i },
        );
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId.trim())) {
        throw new NodeOperationError(
            this.getNode(),
            `File ID must be a valid UUID. Received: "${fileId}". Please use the file_id from the File Upload operation.`,
            { itemIndex: i },
        );
    }

    // Validate model
    if (!model || !model.trim()) {
        throw new NodeOperationError(
            this.getNode(),
            'Model is required. Please select a model from the dropdown.',
            { itemIndex: i },
        );
    }

    // Build request body
    const body: IDataObject = {
        file_id: fileId.trim(),
        model: model.trim(),
    };

    if (additionalFields.language) {
        body.language = additionalFields.language;
    }

    if (additionalFields.context) {
        body.context = additionalFields.context;
    }

    if (additionalFields.translationLanguages) {
        const languages = (additionalFields.translationLanguages as string)
            .split(',')
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0);
        
        if (languages.length > 0) {
            body.translation_languages = languages;
        }
    }

    if (additionalFields.enableSpeakerDiarization) {
        body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
    }

    if (additionalFields.includeNonFinal) {
        body.include_nonfinal = additionalFields.includeNonFinal;
    }

    // Step 1: Create transcription
    const createResponse = await sonioxApiRequest.call(
        this,
        'POST',
        '/transcriptions',
        body,
    );

    const transcriptionId = createResponse.transcription_id;
    
    if (!transcriptionId) {
        throw new NodeOperationError(
            this.getNode(),
            'Failed to create transcription: no transcription_id returned',
            { itemIndex: i },
        );
    }

    // Step 2: Poll for completion
    const startTime = Date.now();
    const maxWaitMs = maxWaitTime * 1000;
    const checkIntervalMs = checkInterval * 1000;

    let transcriptionResult: IDataObject | null = null;
    let lastStatus = '';

    while (Date.now() - startTime < maxWaitMs) {
        // Wait before checking
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));

        // Check transcription status
        const statusResponse = await sonioxApiRequest.call(
            this,
            'GET',
            `/transcriptions/${transcriptionId}`,
        );

        lastStatus = (statusResponse.status as string) || '';

        // Check if completed
        if (lastStatus === 'completed' || lastStatus === 'COMPLETED') {
            transcriptionResult = statusResponse;
            break;
        }

        // Check if failed
        if (lastStatus === 'failed' || lastStatus === 'FAILED' || lastStatus === 'error' || lastStatus === 'ERROR') {
            throw new NodeOperationError(
                this.getNode(),
                `Transcription failed with status: ${lastStatus}. ${statusResponse.error || ''}`,
                { itemIndex: i },
            );
        }

        // Continue polling (status is likely 'processing' or 'pending')
    }

    // Check if we got result or timed out
    if (!transcriptionResult) {
        throw new NodeOperationError(
            this.getNode(),
            `Transcription timeout after ${maxWaitTime} seconds. Last status: ${lastStatus}. Transcription ID: ${transcriptionId}`,
            { itemIndex: i },
        );
    }

    returnData.push({ json: transcriptionResult });
}
```

## Где вставить

Найдите в файле `nodes/Soniox/Soniox.node.ts` эту секцию:

```typescript
                returnData.push({ json: response });
            }

            else if (operation === 'get') {  // <--- ВСТАВИТЬ ПЕРЕД ЭТОЙ СТРОКОЙ
```

И вставьте код операции `createAndWait` между строкой `}` после `create` и строкой `else if (operation === 'get')`.

## Результат

После вставки должно получиться:

```typescript
                returnData.push({ json: response });
            }

            else if (operation === 'createAndWait') {
                // ... весь код операции createAndWait ...
                returnData.push({ json: transcriptionResult });
            }

            else if (operation === 'get') {
                const transcriptionId = this.getNodeParameter('transcriptionId', i) as string;
                // ...
```

## Проверка

После вставки запустите:

```bash
npm run build
npm run lint
```

Если нет ошибок - готово!
