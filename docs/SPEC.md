# Техническая Спецификация (v2.0)
# n8n-nodes-soniox-api

**Version:** 2.0
**Date:** 2026-01-23
**Status:** Production (v0.6.0)

---

## 1. Архитектура

### 1.1 Структура проекта
Проект использует модульную архитектуру с разделением ответственности:

```
n8n-nodes-soniox-api/
├── credentials/
│   └── SonioxApi.credentials.ts    # Аутентификация (Bearer Token)
├── nodes/
│   └── Soniox/
│       ├── Soniox.node.ts          # Основной класс ноды (Dispatcher)
│       ├── GenericFunctions.ts     # Базовые HTTP запросы, retry logic
│       ├── handlers/               # Бизнес-логика
│       │   ├── FileHandler.ts      # Загрузка файлов (Streams), Listing
│       │   ├── TranscriptionHandler.ts # Транскрипция, Polling, Cleanup
│       │   └── ModelHandler.ts     # Получение моделей
│       └── descriptions/           # UI описания полей
│           ├── FileDescription.ts
│           ├── TranscriptionDescription.ts
│           └── ModelDescription.ts
├── docs/                           # Документация
├── package.json
└── tsconfig.json                   # ES2022 Target
```

### 1.2 Технологический стек
- **Runtime:** Node.js 22+
- **Language:** TypeScript 5.x (Strict Mode)
- **Target:** ES2022
- **Core Dependencies:** `n8n-workflow`, `n8n-core` (peer dependencies)
- **Utilities:** Native Node.js APIs (`stream`, `buffer`) - **Zero External Runtime Deps**

---

## 2. Реализованный Функционал

### 2.1 File Operations (`FileHandler.ts`)
- **Upload:**
  - Поддержка `multipart/form-data`.
  - **Streaming Upload:** Использование `Readable` потоков для файлов любого размера (до 1GB) без OOM.
  - Авто-определение MIME-типов.
- **List:** Пагинация и фильтрация загруженных файлов.
- **Get/Delete:** Управление файлами по ID.

### 2.2 Transcription Operations (`TranscriptionHandler.ts`)
- **Transcribe (All-in-One):**
  - Поддержка источников: `Binary Data` или `Audio URL`.
  - Асинхронный поллинг статуса (`queued` -> `processing` -> `completed`).
  - `maxWaitTime`: до 300 минут.
- **Cleanup Strategies:**
  - `deleteAudioFile`: Удаление исходного файла сразу после постановки в очередь.
  - `deleteTranscription`: Удаление записи транскрипции после получения результата.
- **Features:** Speaker Diarization, Translations, Custom Context.

### 2.3 Reliability & Security
- **Retry Logic:** Exponential backoff для ошибок сети и 429 Rate Limits.
- **Security:**
  - Отсутствие уязвимых зависимостей (фиксированные версии через `overrides`).
  - Очистка чувствительных данных из логов.
  - Strict input validation.

---

## 3. API Integration Details

### 3.1 Authentication
Используется стандартный механизм n8n credentials:
- **Header:** `Authorization: Bearer <API_KEY>`
- **Base URL:** `https://api.soniox.com`

### 3.2 Error Handling
Централизованная обработка ошибок в `GenericFunctions.ts`:
- **Network Errors:** Авто-ретрай.
- **API Errors:** Проброс сообщений от Soniox (`error_message`, `error_type`).
- **Validation:** Pre-flight проверки (MIME types, Required fields).

---

## 4. Development & Build

### 4.1 Scripts
- `npm run build`: Компиляция TS + копирование иконок (Gulp).
- `npm run lint`: ESLint (Flat Config) проверка.
- `npm audit`: Проверка уязвимостей.

### 4.2 Guidelines
- Использовать "Native Support" (избегать лишних npm пакетов).
- Строгая типизация (no `any`).
- Модульность (код в `handlers/`).

---

## 5. Roadmap
- [ ] Unit Tests (Jest)
- [ ] Integration Tests (Live API)
- [ ] Webhooks support (if Soniox adds them)
