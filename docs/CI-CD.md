# CI/CD Pipeline Documentation

## Обзор

Проект использует GitHub Actions для автоматизации процессов:
- Continuous Integration (проверка кода)
- Автоматическая публикация в npm
- Управление релизами и версиями

---

## Workflows

### 1. `ci.yml` - Continuous Integration

**Триггеры:**
- Push в ветки `main` или `develop`
- Pull requests в эти ветки

**Шаги:**
1. Checkout кода
2. Установка Node.js 22 (LTS)
3. Установка зависимостей (`npm ci`)
4. Линтинг (`npm run lint`)
5. Сборка (`npm run build`)
6. Проверка структуры `dist/`

**Цель:** Обеспечить качество кода перед слиянием

---

### 2. `create-release.yml` - Создание релиза

**Триггер:** Ручной запуск (`workflow_dispatch`)

**Параметры:**
- `version` - версия релиза (например, `0.1.1`)
- `prerelease` - флаг пре-релиза (boolean)

**Шаги:**
1. Валидация формата версии (Semantic Versioning)
2. Проверка существования тега
3. Обновление `package.json` с новой версией
4. Извлечение заметок из `CHANGELOG.md`
5. Commit и push изменений
6. Создание и push git tag `vX.Y.Z`
7. Создание GitHub Release

**Выходные данные:**
- Git tag: `vX.Y.Z`
- GitHub Release с описанием из CHANGELOG

**Триггерит:** Запускает `publish.yml` при создании релиза

---

### 3. `publish.yml` - Публикация в npm

**Триггеры:**
- Создание GitHub Release (`release: published`)
- Ручной запуск с указанием версии

**Шаги:**
1. Checkout кода с полной историей
2. Установка Node.js 22 с настройкой npm registry
3. Установка зависимостей (`npm ci`)
4. Линтинг (`npm run lint`)
5. Сборка (`npm run build`)
6. Проверка директории `dist/`
7. Обновление версии из тега или input
8. Публикация в npm (`npm publish --access public`)
9. Создание релиз-ветки `release/vX.Y.Z`

**Требования:**
- GitHub Secret: `NPM_TOKEN`
- Права на публикацию пакета в npm

**Результат:**
- Пакет опубликован на [npmjs.com](https://www.npmjs.com/package/n8n-nodes-soniox-api)
- Создана ветка `release/vX.Y.Z`

---

## Секреты GitHub

### Необходимые секреты

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `NPM_TOKEN` | Токен для публикации | [npmjs.com → Settings → Access Tokens](https://www.npmjs.com/settings/~/tokens) |
| `GITHUB_TOKEN` | Автоматически предоставляется GitHub Actions | - |

### Настройка NPM_TOKEN

1. Войдите на [npmjs.com](https://www.npmjs.com/)
2. Перейдите: Account → Access Tokens → Generate New Token
3. Тип токена: **Automation** (для CI/CD)
4. Скопируйте токен (показывается только один раз)
5. Добавьте в GitHub:
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `NPM_TOKEN`
   - Value: `<ваш_токен>`

---

## Процесс релиза

### Стандартный процесс

```
1. Разработка в feature ветках
   └─> Pull Request в develop/main
       └─> CI проверяет код
           └─> Merge при успешных проверках

2. Подготовка к релизу
   └─> Обновление CHANGELOG.md
       └─> Создание релиза (create-release.yml)
           └─> Создание GitHub Release
               └─> Автоматическая публикация (publish.yml)
                   └─> Пакет доступен в npm
```

### Semantic Versioning

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): Новые функции (обратная совместимость)
- **PATCH** (0.0.1): Исправления багов

**Примеры:**
- `0.1.0` → `0.1.1` (bug fix)
- `0.1.0` → `0.2.0` (новая функция)
- `0.1.0` → `1.0.0` (breaking change)

---

## Структура веток

```
main/
  ├── develop (разработка)
  ├── feature/* (новые функции)
  ├── release/v* (релизы, автоматически)
  └── hotfix/* (срочные исправления)
```

**Стратегия:**
- `main` - стабильная версия
- `develop` - текущая разработка
- `release/vX.Y.Z` - создаются автоматически при публикации

---

## Локальная разработка

### Проверка перед коммитом

```bash
# Линтинг
npm run lint

# Автоисправление
npm run lintfix

# Сборка
npm run build

# Проверка package.json
npm pack --dry-run
```

### Тестирование CI локально

```bash
# Установить act (https://github.com/nektos/act)
brew install act  # macOS
# или
sudo apt install act  # Linux

# Запустить CI workflow локально
act -j lint-and-build
```

---

## Мониторинг и отладка

### Проверка статуса workflows

1. **GitHub UI:**
   - Repository → Actions
   - Выберите workflow
   - Просмотр логов каждого шага

2. **GitHub CLI:**
   ```bash
   # Список запусков
   gh run list
   
   # Просмотр логов
   gh run view <run-id> --log
   ```

### Частые проблемы

**Проблема:** `npm publish 403 Forbidden`

**Причины:**
- NPM_TOKEN недействителен
- Нет прав на публикацию пакета
- Пакет с такой версией уже существует

**Решение:**
```bash
# Проверить версию пакета в npm
npm view n8n-nodes-soniox-api versions

# Создать новый токен на npmjs.com
# Обновить NPM_TOKEN в GitHub Secrets
```

---

**Проблема:** `Build failed` в CI

**Причины:**
- Ошибки линтинга
- TypeScript ошибки
- Отсутствующие зависимости

**Решение:**
```bash
# Локально проверить
npm ci
npm run lint
npm run build

# Проверить git status
git status
```

---

**Проблема:** Релиз создан, но пакет не опубликован

**Причины:**
- Ошибка в publish workflow
- NPM_TOKEN истёк

**Решение:**
1. Проверить логи workflow `publish.yml`
2. Ручная публикация:
   ```bash
   git checkout v0.1.1
   npm ci
   npm run build
   npm publish --access public
   ```

---

## Best Practices

1. **Всегда обновляйте CHANGELOG.md** перед релизом
2. **Тестируйте локально** перед push
3. **Используйте pre-release** для тестовых версий
4. **Следуйте Semantic Versioning**
5. **Не пропускайте CI проверки**
6. **Документируйте breaking changes** в CHANGELOG

---

## Ссылки

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
