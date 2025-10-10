# Установка и использование n8n-nodes-soniox-api

## 📦 Установка в n8n

### Вариант 1: Локальная установка для тестирования

```bash
# В директории проекта
npm link

# В директории n8n
npm link n8n-nodes-soniox-api

# Перезапустить n8n
```

### Вариант 2: Установка из npm (после публикации)

```bash
npm install n8n-nodes-soniox-api
```

### Вариант 3: Community Nodes (в n8n UI)

1. Settings → Community Nodes
2. Install → `n8n-nodes-soniox-api`
3. Restart n8n

---

## 🔑 Настройка Credentials

1. В n8n: **Credentials → Add Credential → Soniox API**
2. Заполнить:
   - **API Key**: ваш ключ с [console.soniox.com](https://console.soniox.com/)
   - **API URL**: `https://api.soniox.com/v1` (по умолчанию)
3. Сохранить

---

## 🚀 Примеры использования

### Пример 1: Загрузка и транскрипция файла

**Workflow:**
```
[Read Binary File] → [Soniox: Upload] → [Soniox: Transcription Create] → [Soniox: Transcription Get]
```

**Настройки:**

1. **Read Binary File**
   - Property Name: `data`
   - File Path: `/path/to/audio.mp3`

2. **Soniox: Upload**
   - Resource: `File`
   - Operation: `Upload`
   - Binary Property: `data`
   - File Name: `audio.mp3` (опционально)

3. **Soniox: Transcription Create**
   - Resource: `Transcription`
   - Operation: `Create`
   - File ID: `{{ $json.fileId }}`
   - Model: `en_v2_lowlatency`

4. **Soniox: Transcription Get**
   - Resource: `Transcription`
   - Operation: `Get`
   - Transcription ID: `{{ $json.transcriptionId }}`

---

### Пример 2: Список всех файлов

**Настройки:**
- Resource: `File`
- Operation: `Get All`
- Return All: `false`
- Limit: `50`

---

### Пример 3: Получить доступные модели

**Настройки:**
- Resource: `Model`
- Operation: `Get All`

---

## 🧪 Тестирование

### Подготовка тестового окружения

**1. Установка ноды в локальный n8n:**

```bash
# В директории проекта
npm run build
npm link

# В директории вашего n8n
cd ~/.n8n
npm link n8n-nodes-soniox-api

# Перезапустить n8n
n8n start
```

**2. Настройка Credentials:**
- Получите API Key: [console.soniox.com](https://console.soniox.com/)
- В n8n: **Credentials → Add → Soniox API**
- Заполните:
  - API Key: `ваш_тестовый_ключ`
  - API URL: `https://api.soniox.com/v1`

**3. Подготовка тестовых данных:**
- Подготовьте аудиофайл (MP3, WAV, FLAC, OGG)
- Рекомендуемый размер: до 10 MB для быстрых тестов
- Язык: английский (для модели `en_v2_lowlatency`)

---

### Checklist тестирования операций

#### ✅ File Operations

**Upload:**
- [ ] Загрузка MP3 файла
- [ ] Загрузка WAV файла
- [ ] Проверка возврата `fileId`
- [ ] Обработка ошибки при отсутствии binary data

**Get:**
- [ ] Получение файла по существующему ID
- [ ] Обработка ошибки 404 для несуществующего ID

**Get All:**
- [ ] Список файлов с лимитом (например, 10)
- [ ] Пагинация (Return All = true)

**Delete:**
- [ ] Удаление существующего файла
- [ ] Проверка успешного удаления

#### ✅ Transcription Operations

**Create:**
- [ ] Создание транскрипции с fileId
- [ ] Выбор модели (`en_v2_lowlatency`)
- [ ] Включение speaker diarization (если нужно)
- [ ] Проверка возврата `transcriptionId`

**Get:**
- [ ] Получение готовой транскрипции
- [ ] Проверка структуры результата (words, text)

**Get All:**
- [ ] Список всех транскрипций

#### ✅ Model Operations

**Get All:**
- [ ] Получение списка доступных моделей
- [ ] Проверка структуры (modelId, language)

---

### Пример полного тестового workflow

**Сценарий:** Upload → Transcribe → Get Result → Delete

```
1. [Read Binary File] 
   - File Path: /path/to/test-audio.mp3
   - Property Name: data
   
2. [Soniox: Upload]
   - Binary Property: data
   - ✓ Проверить: fileId в выводе
   
3. [Soniox: Create Transcription]
   - File ID: {{ $json.fileId }}
   - Model: en_v2_lowlatency
   - ✓ Проверить: transcriptionId в выводе
   
4. [Wait] 
   - Time: 10 seconds
   (транскрипция может занять время)
   
5. [Soniox: Get Transcription]
   - Transcription ID: {{ $('Soniox: Create Transcription').item.json.transcriptionId }}
   - ✓ Проверить: текст транскрипции
   
6. [Soniox: Delete File]
   - File ID: {{ $('Soniox: Upload').item.json.fileId }}
   - ✓ Проверить: success
```

---

### Проверка качества кода

```bash
# Запустить линтер
npm run lint

# Исправить ошибки линтера
npm run lintfix

# Пересобрать проект
npm run build
```

---

### Troubleshooting

**Проблема:** Нода не отображается в n8n

**Решение:**
```bash
# Переустановить линк
npm unlink -g n8n-nodes-soniox-api
npm run build
npm link
# Перезапустить n8n
```

**Проблема:** `401 Unauthorized`

**Решение:**
- Проверить API Key в Credentials
- Убедиться, что ключ активен на [console.soniox.com](https://console.soniox.com/)

**Проблема:** `400 Bad Request` при Upload

**Решение:**
- Проверить формат аудиофайла (поддерживаемые: MP3, WAV, FLAC, OGG)
- Убедиться, что Binary Property указан правильно
- Проверить размер файла (лимит API)

**Проблема:** Transcription возвращает пустой результат

**Решение:**
- Дождаться завершения обработки (добавить Wait node)
- Проверить статус транскрипции через Get operation
- Убедиться, что выбрана правильная модель для языка аудио

**Проблема:** `fileId` не передается в следующую ноду

**Решение:**
- Использовать Expression: `{{ $json.fileId }}`
- Проверить, что предыдущая нода выполнилась успешно
- В режиме отладки проверить JSON output

**Проблема:** Битая иконка ноды в n8n

**Решение:**
```bash
# Иконка не скопировалась при сборке
npm run build

# Проверить структуру
ls dist/nodes/Soniox/soniox.svg

# Если файл отсутствует - проблема в gulpfile.js
# Должно быть: { base: '.' } в src()

# Переустановить линк
npm unlink -g n8n-nodes-soniox-api
npm link
```

---

## 📝 Структура проекта

```
n8n-nodes-soniox-api/
├── credentials/
│   └── SonioxApi.credentials.ts
├── nodes/
│   └── Soniox/
│       ├── Soniox.node.ts
│       ├── Soniox.node.json
│       ├── soniox.svg
│       ├── descriptions/
│       │   ├── FileDescription.ts
│       │   ├── TranscriptionDescription.ts
│       │   └── ModelDescription.ts
│       └── GenericFunctions.ts
├── dist/ (после сборки)
├── package.json
├── tsconfig.json
└── gulpfile.js
```

---

## 🔗 Ресурсы

- **Документация Soniox API**: https://soniox.com/docs/stt/api-reference
- **n8n Docs**: https://docs.n8n.io/integrations/creating-nodes/
- **GitHub**: https://github.com/mazixs/n8n-nodes-soniox-api

---

## ⚠️ Важно

1. **API Key** должен быть действительным из Soniox Console
2. **Binary data** обязательны для upload операции
3. **File ID** из предыдущей ноды используется в `{{ $json.fileId }}`
4. **Модели** доступны через Resource: Model → Get All
