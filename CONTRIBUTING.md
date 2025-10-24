# Contributing to n8n-nodes-soniox-api

Thank you for your interest in contributing! 🎉

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

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` dependency updates, etc.

**Examples:**
```
feat: add support for streaming transcription
fix: handle binary data validation correctly
docs: update installation instructions
```

## 🐛 Bug Reports

When creating an issue, please include:
- n8n version
- Node version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## 💡 Feature Requests

Please describe:
- The problem the feature solves
- Proposed solution
- Alternatives (if any)
- Use case examples

## 📦 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v0.x.x`
4. Push: `git push origin v0.x.x`
5. Publish to npm: `npm publish`

## 🔗 Resources

- [n8n Node Development Docs](https://docs.n8n.io/integrations/creating-nodes/)
- [Soniox API Documentation](https://soniox.com/docs/stt/api-reference)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

MIT License - see [LICENSE](LICENSE)
