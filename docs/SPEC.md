# Техническое задание
# n8n-nodes-soniox-api

**Version:** 1.0  
**Date:** 2025-10-08  
**Status:** Draft

---

## 1. Архитектура ноды

### 1.1 Структура проекта

```
n8n-nodes-soniox-api/
├── credentials/
│   └── SonioxApi.credentials.ts
├── nodes/
│   └── Soniox/
│       ├── Soniox.node.ts
│       ├── Soniox.node.json
│       ├── descriptions/
│       │   ├── FileDescription.ts
│       │   ├── TranscriptionDescription.ts
│       │   └── ModelDescription.ts
│       └── GenericFunctions.ts
├── package.json
├── tsconfig.json
├── README.md
└── docs/
    ├── PRD.md
    └── TECHNICAL_SPEC.md
```

### 1.2 package.json (правильная конфигурация)

```json
{
  "name": "n8n-nodes-soniox-api",
  "version": "0.1.0",
  "description": "n8n node for Soniox Speech-to-Text API",
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "lint": "tslint -p tsconfig.json -c tslint.json",
    "lintfix": "tslint --fix -p tsconfig.json -c tslint.json",
    "prepublishOnly": "npm run build && npm run lint"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/SonioxApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Soniox/Soniox.node.js"
    ]
  },
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "soniox",
    "speech-to-text",
    "transcription"
  ],
  "license": "MIT",
  "homepage": "https://github.com/yourusername/n8n-nodes-soniox-api",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/n8n-nodes-soniox-api.git"
  },
  "devDependencies": {
    "@types/node": "^18.16.0",
    "typescript": "~5.1.6",
    "tslint": "^6.1.3",
    "n8n-workflow": "latest",
    "n8n-core": "latest",
    "gulp": "^4.0.2"
  }
}
```

**Важно:**
- **n8n-workflow** и **n8n-core** только в devDependencies (они уже встроены в n8n)
- Обязательно поле **"n8n"** с путями к dist файлам
- **"files": ["dist"]** - публикуем только собранные файлы
- gulp для обработки иконок

---

## 2. Credentials Implementation

### 2.1 SonioxApi.credentials.ts

```typescript
import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SonioxApi implements ICredentialType {
  name = 'sonioxApi';
  displayName = 'Soniox API';
  documentationUrl = 'https://soniox.com/docs/stt/get-started';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'The Soniox API key for authentication',
    },
    {
      displayName: 'API URL',
      name: 'apiUrl',
      type: 'string',
      default: 'https://api.soniox.com/v1',
      description: 'The base URL for Soniox API',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'Authorization': '=Bearer {{$credentials.apiKey}}',
      },
    },
  };
}
```

---

## 3. Node Implementation

### 3.1 Soniox.node.ts (Main Structure)

```typescript
import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
} from 'n8n-workflow';

import { fileFields, fileOperations } from './descriptions/FileDescription';
import { transcriptionFields, transcriptionOperations } from './descriptions/TranscriptionDescription';
import { modelFields, modelOperations } from './descriptions/ModelDescription';

export class Soniox implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Soniox',
    name: 'soniox',
    icon: 'file:soniox.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Soniox Speech-to-Text API',
    defaults: {
      name: 'Soniox',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'sonioxApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'File',
            value: 'file',
          },
          {
            name: 'Model',
            value: 'model',
          },
          {
            name: 'Transcription',
            value: 'transcription',
          },
        ],
        default: 'transcription',
      },
      ...fileOperations,
      ...fileFields,
      ...transcriptionOperations,
      ...transcriptionFields,
      ...modelOperations,
      ...modelFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'file') {
          // File operations
        } else if (resource === 'transcription') {
          // Transcription operations
        } else if (resource === 'model') {
          // Model operations
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
```

---

## 4. Resource Descriptions

### 4.1 FileDescription.ts

```typescript
import { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['file'],
      },
    },
    options: [
      {
        name: 'Upload',
        value: 'upload',
        description: 'Upload an audio file',
        action: 'Upload a file',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a file by ID',
        action: 'Get a file',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all files',
        action: 'Get all files',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete a file',
        action: 'Delete a file',
      },
    ],
    default: 'upload',
  },
];

export const fileFields: INodeProperties[] = [
  // Upload operation
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    required: true,
    displayOptions: {
      show: {
        resource: ['file'],
        operation: ['upload'],
      },
    },
    description: 'Name of the binary property containing the file',
  },
  {
    displayName: 'File Name',
    name: 'fileName',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['file'],
        operation: ['upload'],
      },
    },
    description: 'Name of the file to upload',
  },
  // Get/Delete operations
  {
    displayName: 'File ID',
    name: 'fileId',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['file'],
        operation: ['get', 'delete'],
      },
    },
    description: 'The ID of the file',
  },
  // Get All operation
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['file'],
        operation: ['getAll'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['file'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },
];
```

### 4.2 TranscriptionDescription.ts

```typescript
import { INodeProperties } from 'n8n-workflow';

export const transcriptionOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['transcription'],
      },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a transcription',
        action: 'Create a transcription',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a transcription',
        action: 'Get a transcription',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all transcriptions',
        action: 'Get all transcriptions',
      },
    ],
    default: 'create',
  },
];

export const transcriptionFields: INodeProperties[] = [
  // Create operation
  {
    displayName: 'File ID',
    name: 'fileId',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['transcription'],
        operation: ['create'],
      },
    },
    description: 'The ID of the file to transcribe',
  },
  {
    displayName: 'Model',
    name: 'model',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['transcription'],
        operation: ['create'],
      },
    },
    description: 'The model to use for transcription',
    placeholder: 'e.g., en_v2_lowlatency',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['transcription'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Language',
        name: 'language',
        type: 'string',
        default: '',
        description: 'Language code (e.g., en, es, fr)',
      },
      {
        displayName: 'Enable Speaker Diarization',
        name: 'enableSpeakerDiarization',
        type: 'boolean',
        default: false,
        description: 'Whether to enable speaker diarization',
      },
      {
        displayName: 'Include Non-Final',
        name: 'includeNonFinal',
        type: 'boolean',
        default: false,
        description: 'Whether to include non-final results',
      },
    ],
  },
  // Get operation
  {
    displayName: 'Transcription ID',
    name: 'transcriptionId',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['transcription'],
        operation: ['get'],
      },
    },
    description: 'The ID of the transcription',
  },
  // Get All operation
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['transcription'],
        operation: ['getAll'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['transcription'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },
];
```

### 4.3 ModelDescription.ts

```typescript
import { INodeProperties } from 'n8n-workflow';

export const modelOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['model'],
      },
    },
    options: [
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all available models',
        action: 'Get all models',
      },
    ],
    default: 'getAll',
  },
];

export const modelFields: INodeProperties[] = [];
```

---

## 5. Generic Functions

### 5.1 GenericFunctions.ts

```typescript
import {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IDataObject,
  IHttpRequestMethods,
  IRequestOptions,
  NodeApiError,
} from 'n8n-workflow';

export async function sonioxApiRequest(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
  uri?: string,
  option: IDataObject = {},
): Promise<any> {
  const credentials = await this.getCredentials('sonioxApi');

  const options: IRequestOptions = {
    method,
    qs,
    uri: uri || `${credentials.apiUrl}${endpoint}`,
    json: true,
  };

  // Headers
  options.headers = {
    'Authorization': `Bearer ${credentials.apiKey}`,
  };

  // Handle multipart/form-data (для file upload)
  if (option.formData) {
    options.formData = option.formData;
    // Content-Type устанавливается автоматически для multipart
  } else {
    // Обычный JSON request
    options.body = body;
    options.headers['Content-Type'] = 'application/json';
  }

  try {
    return await this.helpers.request(options);
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}

export async function sonioxApiRequestAllItems(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
): Promise<any> {
  const returnData: IDataObject[] = [];
  let responseData;
  qs.limit = 100;
  qs.offset = 0;

  do {
    responseData = await sonioxApiRequest.call(this, method, endpoint, body, qs);
    returnData.push(...responseData.items);
    qs.offset = (qs.offset as number) + qs.limit;
  } while (responseData.items.length !== 0);

  return returnData;
}
```

---

## 6. Execute Logic Implementation

### 6.1 File Upload Operation (Полная реализация)

```typescript
// В Soniox.node.ts execute():

if (resource === 'file') {
  if (operation === 'upload') {
    // 1. Получить параметры
    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
    const fileName = this.getNodeParameter('fileName', i, '') as string;
    
    // 2. Валидация binary data
    if (!items[i].binary) {
      throw new NodeOperationError(
        this.getNode(),
        'No binary data exists on input item. Please connect a node that provides binary data.',
        { itemIndex: i }
      );
    }
    
    const binaryData = items[i].binary[binaryPropertyName];
    if (!binaryData) {
      const availableProperties = Object.keys(items[i].binary);
      throw new NodeOperationError(
        this.getNode(),
        `Binary property "${binaryPropertyName}" not found. Available: ${availableProperties.join(', ')}`,
        { itemIndex: i }
      );
    }
    
    // 3. Получить Buffer из binary data
    const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
    
    // 4. Определить имя файла
    const uploadFileName = fileName || binaryData.fileName || 'file';
    
    // 5. Подготовить formData для multipart/form-data
    const formData = {
      file: {
        value: buffer,
        options: {
          filename: uploadFileName,
          contentType: binaryData.mimeType || 'application/octet-stream',
        },
      },
    };
    
    // 6. Upload через API
    const response = await sonioxApiRequest.call(
      this,
      'POST',
      '/files',
      {},
      {},
      undefined,
      { formData }
    );
    
    // 7. Вернуть результат
    returnData.push({
      json: {
        fileId: response.file_id,
        fileName: uploadFileName,
        mimeType: binaryData.mimeType,
        fileSize: binaryData.fileSize,
        uploadedAt: new Date().toISOString(),
      },
    });
  }
  
  else if (operation === 'get') {
    const fileId = this.getNodeParameter('fileId', i) as string;
    
    const response = await sonioxApiRequest.call(
      this,
      'GET',
      `/files/${fileId}`,
    );
    
    returnData.push({ json: response });
  }
  
  else if (operation === 'getAll') {
    const returnAll = this.getNodeParameter('returnAll', i);
    
    let responseData;
    if (returnAll) {
      responseData = await sonioxApiRequestAllItems.call(
        this,
        'GET',
        '/files',
      );
    } else {
      const limit = this.getNodeParameter('limit', i);
      responseData = await sonioxApiRequest.call(
        this,
        'GET',
        '/files',
        {},
        { limit },
      );
    }
    
    const items = Array.isArray(responseData) ? responseData : responseData.items || [];
    items.forEach((item: IDataObject) => {
      returnData.push({ json: item });
    });
  }
  
  else if (operation === 'delete') {
    const fileId = this.getNodeParameter('fileId', i) as string;
    
    await sonioxApiRequest.call(
      this,
      'DELETE',
      `/files/${fileId}`,
    );
    
    returnData.push({
      json: {
        success: true,
        fileId,
      },
    });
  }
}
```

### 6.2 Transcription Operations

```typescript
if (resource === 'transcription') {
  if (operation === 'create') {
    const fileId = this.getNodeParameter('fileId', i) as string;
    const model = this.getNodeParameter('model', i, '') as string;
    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
    
    const body: IDataObject = {
      file_id: fileId,
    };
    
    if (model) {
      body.model = model;
    }
    
    if (additionalFields.language) {
      body.language = additionalFields.language;
    }
    
    if (additionalFields.enableSpeakerDiarization) {
      body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
    }
    
    if (additionalFields.includeNonFinal) {
      body.include_nonfinal = additionalFields.includeNonFinal;
    }
    
    const response = await sonioxApiRequest.call(
      this,
      'POST',
      '/transcriptions',
      body,
    );
    
    returnData.push({ json: response });
  }
  
  else if (operation === 'get') {
    const transcriptionId = this.getNodeParameter('transcriptionId', i) as string;
    
    const response = await sonioxApiRequest.call(
      this,
      'GET',
      `/transcriptions/${transcriptionId}`,
    );
    
    returnData.push({ json: response });
  }
  
  else if (operation === 'getAll') {
    const returnAll = this.getNodeParameter('returnAll', i);
    
    let responseData;
    if (returnAll) {
      responseData = await sonioxApiRequestAllItems.call(
        this,
        'GET',
        '/transcriptions',
      );
    } else {
      const limit = this.getNodeParameter('limit', i);
      responseData = await sonioxApiRequest.call(
        this,
        'GET',
        '/transcriptions',
        {},
        { limit },
      );
    }
    
    const items = Array.isArray(responseData) ? responseData : responseData.items || [];
    items.forEach((item: IDataObject) => {
      returnData.push({ json: item });
    });
  }
}
```

### 6.3 Model Operations

```typescript
if (resource === 'model') {
  if (operation === 'getAll') {
    const response = await sonioxApiRequest.call(
      this,
      'GET',
      '/models',
    );
    
    const models = Array.isArray(response) ? response : response.models || [];
    models.forEach((model: IDataObject) => {
      returnData.push({ json: model });
    });
  }
}
```

---

## 7. Implementation Plan

### 7.1 Phase 1: Базовая структура (Неделя 1)

**День 1-2: Инициализация**
- [ ] Инициализировать npm проект
- [ ] Настроить TypeScript
- [ ] Создать базовую структуру директорий
- [ ] Настроить credentials

**День 3-5: File Resource**
- [ ] Реализовать File operations (upload, get, getAll, delete)
- [ ] Тестирование File operations
- [ ] Обработка ошибок

**День 6-7: Документация**
- [ ] README с примерами
- [ ] JSDoc для функций

### 7.2 Phase 2: Транскрипция (Неделя 2)

**День 1-3: Transcription Resource**
- [ ] Реализовать Transcription operations
- [ ] Polling для async статуса
- [ ] Обработка результатов

**День 4-5: Model Resource**
- [ ] Реализовать Model operations
- [ ] Integration тестирование

**День 6-7: Testing & Linting**
- [ ] Unit тесты
- [ ] n8n-node-linter
- [ ] Bug fixes

### 7.3 Phase 3: Finalization (Неделя 3)

**День 1-3: Доработки**
- [ ] Advanced parameters
- [ ] Error handling improvements
- [ ] Performance optimization

**День 4-5: Documentation**
- [ ] Полная документация
- [ ] Примеры workflows
- [ ] Changelog

**День 6-7: Release**
- [ ] Тестирование в реальных условиях
- [ ] npm публикация
- [ ] Подача в n8n community

---

## 7. Testing Strategy

### 7.1 Unit Tests
```typescript
describe('Soniox Node', () => {
  describe('File Upload', () => {
    it('should upload file successfully', async () => {
      // Test implementation
    });

    it('should handle upload errors', async () => {
      // Test implementation
    });
  });

  describe('Transcription Create', () => {
    it('should create transcription', async () => {
      // Test implementation
    });
  });
});
```

### 7.2 Integration Tests
- Mock Soniox API responses
- Test complete workflows
- Error scenarios

### 7.3 Manual Testing Checklist
- [ ] Credentials работают
- [ ] File upload работает
- [ ] Transcription создается
- [ ] Status polling работает
- [ ] Error messages понятные
- [ ] UI корректный

---

## 8. Error Handling

### 8.1 HTTP Error Codes

```typescript
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request - Check your parameters',
  401: 'Unauthorized - Check your API key',
  403: 'Forbidden - Insufficient permissions',
  404: 'Not Found - Resource does not exist',
  429: 'Rate Limit Exceeded - Try again later',
  500: 'Internal Server Error - Soniox API issue',
};
```

### 8.2 Retry Logic

```typescript
async function requestWithRetry(
  requestFunction: () => Promise<any>,
  maxRetries: number = 3,
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFunction();
    } catch (error) {
      if (error.statusCode === 429 && i < maxRetries - 1) {
        await sleep(1000 * (i + 1));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 9. Performance Considerations

### 9.1 Large Files
- Использовать streams для upload
- Chunk-based processing
- Memory limits

### 9.2 Async Operations
- Polling с exponential backoff
- Timeout handling
- Cancel support

---

## 10. Security

### 10.1 API Key Storage
- Использовать n8n credentials system
- Never log API keys
- Sanitize error messages

### 10.2 Data Privacy
- Не хранить audio данные
- Secure transmission (HTTPS)
- Temporary API keys support

---

## 11. Deployment

### 11.1 npm Package
```json
{
  "name": "n8n-nodes-soniox-api",
  "version": "0.1.0",
  "description": "n8n node for Soniox Speech-to-Text API",
  "keywords": ["n8n", "n8n-community-node-package", "soniox", "speech-to-text"],
  "license": "MIT",
  "n8n": {
    "credentials": ["credentials/SonioxApi.credentials.ts"],
    "nodes": ["nodes/Soniox/Soniox.node.ts"]
  }
}
```

### 11.2 Installation
```bash
npm install n8n-nodes-soniox-api
```

### 11.3 n8n Community Node
- Подать через n8n community portal
- Пройти review process
- Получить verification

---

## 12. Maintenance

### 12.1 Versioning
- Semantic versioning (MAJOR.MINOR.PATCH)
- Changelog для каждой версии
- Breaking changes documentation

### 12.2 Updates
- Следить за Soniox API changes
- n8n compatibility updates
- Security patches

---

## 13. Resources

### 13.1 Documentation
- [Soniox API Docs](https://soniox.com/docs/stt/api-reference)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/overview/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)

### 13.2 Tools
- n8n-node-linter
- TypeScript compiler
- Jest (testing)

---

**Next Steps:** Начать с инициализации проекта согласно Phase 1.
