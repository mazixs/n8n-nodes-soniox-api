# Процесс создания релиза

## Быстрый старт

1. Обновите `CHANGELOG.md` с новой версией
2. Перейдите в Actions → Create Release
3. Запустите workflow с указанием версии
4. Автоматически создастся релиз и публикация в npm

---

## Детальный процесс

### 1. Подготовка CHANGELOG

Добавьте новую секцию в `CHANGELOG.md`:

```markdown
## [0.1.1] - 2025-10-10

### Added
- Новая функция X

### Fixed
- Исправлена ошибка Y

### Changed
- Изменено поведение Z
```

### 2. Создание релиза через GitHub Actions

**Способ 1: Через UI**
1. Откройте вкладку **Actions** в репозитории
2. Выберите **Create Release** в левом меню
3. Нажмите **Run workflow**
4. Заполните параметры:
   - **Version**: `0.1.1` (без префикса `v`)
   - **Pre-release**: отметьте, если это тестовая версия
5. Нажмите **Run workflow**

**Способ 2: Через gh CLI**
```bash
gh workflow run create-release.yml -f version=0.1.1 -f prerelease=false
```

### 3. Что произойдет автоматически

Workflow **Create Release** выполнит:
- ✅ Валидация формата версии
- ✅ Проверка, что тег не существует
- ✅ Обновление `package.json` с новой версией
- ✅ Извлечение заметок из `CHANGELOG.md`
- ✅ Commit изменений в `main`
- ✅ Создание git tag `vX.Y.Z`
- ✅ Push тега в GitHub
- ✅ Создание GitHub Release с заметками

После создания релиза, workflow **Publish** автоматически:
- ✅ Checkout кода
- ✅ Установка зависимостей
- ✅ Проверка линтером
- ✅ Сборка проекта (`npm run build`)
- ✅ Публикация в npm
- ✅ Создание релиз-ветки `release/vX.Y.Z`

---

## Структура версий (Semantic Versioning)

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): Новые функции (обратная совместимость)
- **PATCH** (0.0.1): Исправления багов

**Примеры:**
- `0.1.0` → `0.1.1` (bug fix)
- `0.1.0` → `0.2.0` (новая функция)
- `0.1.0` → `1.0.0` (breaking change)

---

## Ручная публикация (без GitHub Actions)

Если нужно опубликовать пакет вручную:

```bash
# 1. Убедитесь, что вы залогинены в npm
npm login

# 2. Обновите версию
npm version patch  # или minor, major

# 3. Соберите проект
npm run build

# 4. Опубликуйте
npm publish --access public

# 5. Отправьте изменения в Git
git push && git push --tags
```

---

## Проверка публикации

После публикации проверьте:

1. **npm Registry:**
   ```bash
   npm view n8n-nodes-soniox-api versions
   ```

2. **GitHub Releases:**
   - Перейдите: https://github.com/mazixs/n8n-nodes-soniox-api/releases
   - Проверьте, что новый релиз создан

3. **Release Branch:**
   ```bash
   git fetch origin
   git branch -r | grep release
   ```

4. **Установка из npm:**
   ```bash
   npm install n8n-nodes-soniox-api@latest
   ```

---

## Troubleshooting

### Ошибка: "Tag already exists"

**Причина:** Тег с этой версией уже создан

**Решение:**
```bash
# Удалите локальный и удалённый тег
git tag -d v0.1.1
git push origin :refs/tags/v0.1.1

# Запустите workflow снова
```

### Ошибка: "npm publish 403"

**Причина:** Проблемы с NPM_TOKEN

**Решение:**
1. Проверьте, что токен добавлен в GitHub Secrets
2. Убедитесь, что токен типа **Automation**
3. Проверьте права доступа к пакету на npmjs.com

### Ошибка: "Build failed"

**Причина:** Ошибки в коде или зависимостях

**Решение:**
```bash
# Локально протестируйте сборку
npm ci
npm run lint
npm run build
```

### Ошибка: "CHANGELOG not found"

**Причина:** Секция версии отсутствует в CHANGELOG.md

**Решение:**
- Workflow создаст релиз с дефолтным описанием
- Добавьте секцию в CHANGELOG.md для следующего релиза

---

## GitHub Secrets

Необходимые секреты (Settings → Secrets → Actions):

| Секрет | Описание | Получить |
|--------|----------|----------|
| `NPM_TOKEN` | Токен для публикации в npm | [npmjs.com/settings/tokens](https://www.npmjs.com/settings/~/tokens) |

**Создание NPM_TOKEN:**
1. Войдите на [npmjs.com](https://www.npmjs.com/)
2. Перейдите: Avatar → Access Tokens → Generate New Token
3. Выберите тип: **Automation**
4. Скопируйте токен (показывается один раз)
5. Добавьте в GitHub: Settings → Secrets → Actions → New secret
   - Name: `NPM_TOKEN`
   - Value: ваш токен

---

## CI/CD Workflows

### 1. `ci.yml` - Continuous Integration
- **Триггер:** Push в `main` или `develop`, Pull Requests
- **Действия:** Lint, Build, Verify
- **Цель:** Проверка качества кода

### 2. `create-release.yml` - Создание релиза
- **Триггер:** Ручной запуск (workflow_dispatch)
- **Действия:** Версионирование, Tagging, GitHub Release
- **Цель:** Подготовка к публикации

### 3. `publish.yml` - Публикация в npm
- **Триггер:** Создание GitHub Release
- **Действия:** Build, Test, Publish to npm, Create release branch
- **Цель:** Автоматическая публикация пакета

---

## Рекомендации

1. **Всегда обновляйте CHANGELOG** перед релизом
2. **Тестируйте локально** перед созданием релиза
3. **Используйте pre-release** для тестовых версий
4. **Следуйте Semantic Versioning**
5. **Проверяйте публикацию** после релиза
