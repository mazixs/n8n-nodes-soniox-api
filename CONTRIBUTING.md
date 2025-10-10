# Contributing to n8n-nodes-soniox-api

Спасибо за интерес к проекту! 🎉

## 🛠️ Development Setup

```bash
# Clone repository
git clone https://github.com/mazixs/n8n-nodes-soniox-api.git
cd n8n-nodes-soniox-api

# Install dependencies
npm install

# Build project
npm run build

# Run linter
npm run lint

# Auto-fix lint issues
npm run lintfix

# Watch mode for development
npm run dev
```

## 📁 Project Structure

```
n8n-nodes-soniox-api/
├── credentials/         # API authentication
├── nodes/
│   └── Soniox/
│       ├── descriptions/  # Resource/operation definitions
│       ├── GenericFunctions.ts  # API helpers
│       └── Soniox.node.ts      # Main node logic
├── dist/               # Compiled output
└── docs/               # Documentation
```

## ✅ Code Quality

### Before submitting PR:

1. **Run linter**:
   ```bash
   npm run lint
   ```

2. **Fix issues**:
   ```bash
   npm run lintfix
   ```

3. **Build successfully**:
   ```bash
   npm run build
   ```

4. **Test in n8n**:
   ```bash
   npm link
   # Test in your n8n instance
   ```

## 📝 Commit Convention

Используем [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` новая функциональность
- `fix:` исправление бага
- `docs:` изменения в документации
- `refactor:` рефакторинг кода
- `test:` добавление тестов
- `chore:` обновление зависимостей и т.д.

**Примеры:**
```
feat: add support for streaming transcription
fix: handle binary data validation correctly
docs: update installation instructions
```

## 🐛 Bug Reports

При создании issue укажите:
- Версию n8n
- Версию ноды
- Шаги для воспроизведения
- Ожидаемое поведение
- Фактическое поведение
- Скриншоты (если применимо)

## 💡 Feature Requests

Опишите:
- Проблему, которую решает фича
- Предлагаемое решение
- Альтернативы (если есть)
- Use case примеры

## 📦 Release Process

1. Обновить версию в `package.json`
2. Обновить `CHANGELOG.md`
3. Создать git tag: `git tag v0.x.x`
4. Push: `git push origin v0.x.x`
5. Опубликовать в npm: `npm publish`

## 🔗 Resources

- [n8n Node Development Docs](https://docs.n8n.io/integrations/creating-nodes/)
- [Soniox API Documentation](https://soniox.com/docs/stt/api-reference)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

MIT License - см. [LICENSE](LICENSE)
