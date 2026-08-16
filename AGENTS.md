# Repository Guidelines

## Project Structure & Module Organization

- `nodes/Soniox/` contains the TypeScript n8n node. `Soniox.node.ts` is the entry point; `descriptions/` defines resources and operations; `handlers/` contains operation-specific logic; `GenericFunctions.ts` and `constants.ts` hold shared API code.
- `credentials/` contains the Soniox credential definition and icon assets. The node and credential SVG files are copied to `dist/` during the build.
- `docs/` contains API notes, specifications, refactoring notes, and CI/CD documentation. `index.js` is the package entry point. Treat `dist/` as generated output and do not edit it directly.

## Build, Test, and Development Commands

```bash
npm ci                 # Install the lockfile-pinned dependencies
npm run build          # Compile TypeScript and copy icons into dist/
npm run dev            # Recompile continuously while editing
npm run lint           # Check TypeScript sources with ESLint
npm run lintfix        # Apply safe ESLint fixes
npm audit --omit=dev   # Audit runtime dependencies
```

For manual n8n testing, run `npm run build && npm link`, then from the n8n directory run `npm link n8n-nodes-soniox-api` and start n8n. The repository currently has no automated test script or test framework.

## Coding Style & Naming Conventions

Use strict TypeScript settings from `tsconfig.json`. Follow `.editorconfig`: UTF-8, LF line endings, final newlines, and tabs for TypeScript, JavaScript, and JSON indentation. ESLint is authoritative for TypeScript; warnings should be addressed when practical. Use `PascalCase` for classes and descriptive module files (for example, `FileHandler.ts`), `camelCase` for functions and variables, and `UPPER_SNAKE_CASE` for constants.

Keep API requests and reusable behavior in shared helpers or handlers; keep node metadata and operation descriptions in their corresponding description files.

## Testing Guidelines

Before submitting changes, run `npm run lint` and `npm run build`. For behavior changes, exercise the affected operation in a linked n8n instance, including binary upload and error paths where relevant. Record the Node.js and n8n versions used; CI covers Node.js 18, 20, and 22.

## Commit & Pull Request Guidelines

Use Conventional Commits, as in the existing history: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:` followed by a concise imperative summary. PRs should explain the change and user impact, link the relevant issue when one exists, list validation commands, and include screenshots or workflow details for node-facing changes. Update `CHANGELOG.md` for release-relevant changes.

## Security & Configuration

Never commit Soniox API keys or n8n credential exports. Use n8n credentials for local testing and run `npm audit --omit=dev` when changing dependencies or HTTP/authentication code.
