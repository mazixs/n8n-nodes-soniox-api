# n8n-nodes-soniox-api

[![npm version](https://img.shields.io/npm/v/n8n-nodes-soniox-api.svg)](https://www.npmjs.com/package/n8n-nodes-soniox-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

n8n community node для интеграции с [Soniox Speech-to-Text API](https://soniox.com/) — высокоточной системой распознавания речи.

## 📦 Установка

### В n8n через UI

1. Settings → Community Nodes → Install
2. Введите: `n8n-nodes-soniox-api`
3. Перезапустите n8n

### Через npm

```bash
npm install n8n-nodes-soniox-api
```

### Локальная разработка

```bash
git clone https://github.com/mazixs/n8n-nodes-soniox-api.git
cd n8n-nodes-soniox-api
npm install
npm run build
npm link
```

Подробнее: [INSTALLATION.md](./INSTALLATION.md)

---

## ✨ Возможности

### File Operations
- **Upload** — загрузка аудио файлов (multipart/form-data)
- **Get** — получение файла по ID
- **Get All** — список всех файлов (с пагинацией)
- **Delete** — удаление файла

### Transcription Operations
- **Create** — создание транскрипции с настройками:
  - Выбор модели
  - Определение языка
  - Speaker diarization
  - Non-final results
- **Get** — получение результата транскрипции
- **Get All** — список всех транскрипций

### Model Operations
- **Get All** — список доступных моделей

---

## 🚀 Быстрый старт

### 1. Настройка Credentials

1. Создать credential: **Soniox API**
2. Получить API Key: [console.soniox.com](https://console.soniox.com/)
3. Указать API URL: `https://api.soniox.com/v1` (по умолчанию)

### 2. Пример Workflow

**Сценарий:** Загрузка аудио → Транскрипция → Получение результата

```
[Read Binary File] 
    ↓
[Soniox: File Upload]
    ↓
[Soniox: Transcription Create]
    ↓
[Soniox: Transcription Get]
```

**Настройки:**

**Node 1: Read Binary File**
- Property Name: `data`
- File Path: `/path/to/audio.mp3`

**Node 2: Soniox File Upload**
- Resource: `File`
- Operation: `Upload`
- Binary Property: `data`

**Node 3: Soniox Transcription Create**
- Resource: `Transcription`
- Operation: `Create`
- File ID: `{{ $json.fileId }}`
- Model: `en_v2_lowlatency`

**Node 4: Soniox Transcription Get**
- Resource: `Transcription`
- Operation: `Get`
- Transcription ID: `{{ $json.transcriptionId }}`

---

## 📖 Документация

- **[INSTALLATION.md](./INSTALLATION.md)** — детальная установка и примеры
- **[CHANGELOG.md](./CHANGELOG.md)** — история изменений
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — правила контрибуции
- **[docs/SPEC.md](./docs/SPEC.md)** — техническая спецификация

---

## 🛠️ Development

```bash
# Установить зависимости
npm install

# Режим разработки (watch)
npm run dev

# Сборка
npm run build

# Линтинг
npm run lint

# Автоисправление
npm run lintfix
```

### 🧪 Тестирование

Подробные инструкции по тестированию ноды: **[INSTALLATION.md#тестирование](./INSTALLATION.md#-тестирование)**

**Краткая инструкция:**
```bash
# Сборка и линковка
npm run build && npm link

# Тестирование в локальном n8n
cd ~/.n8n && npm link n8n-nodes-soniox-api
n8n start
```

См. полный checklist тестирования и troubleshooting в документации.

---

## 🔗 Ссылки

- [Soniox API Documentation](https://soniox.com/docs/stt/api-reference)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [GitHub Repository](https://github.com/mazixs/n8n-nodes-soniox-api)

---

## 📄 License

MIT © [mazix](https://github.com/mazixs)

---

## 🤝 Contributing

Contributions are welcome! См. [CONTRIBUTING.md](./CONTRIBUTING.md)
