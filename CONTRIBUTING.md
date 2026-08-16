# Contributing to n8n-nodes-soniox-api

## Development setup

Use the lockfile-pinned installation and the official n8n node toolchain:

```bash
npm ci                 # install exact dependency versions
npm run dev            # watch mode for TypeScript and assets
npm run lint           # n8n community-node lint rules
npm run lintfix        # apply safe lint fixes
npm test               # unit tests; no live Soniox credentials required
npm run typecheck      # strict TypeScript check
npm run build          # compile sources and copy static files to dist/
npm run check          # lint, tests, build, and package dry-run
```

`dist/` is generated output; edit files under `nodes/` and `credentials/` instead. The main node is `nodes/Soniox/Soniox.node.ts`, operation metadata is in `nodes/Soniox/descriptions/`, shared API code is in `nodes/Soniox/api/`, and tests are in `tests/unit/`.

For manual n8n testing, run `npm run build && npm link`, then run `npm link n8n-nodes-soniox-api` from the n8n installation directory. Never commit API keys or exported n8n credentials.

## Code and compatibility

Use strict TypeScript, tabs and LF line endings from `.editorconfig`, and let `n8n-node lint` define style. Keep API calls in shared helpers or handlers; keep node metadata in description files. Preserve existing credential names, operation values, input names, and output aliases unless a breaking change is explicitly documented.

## Tests and pull requests

Add or update focused Vitest tests for behavior changes. Before opening a pull request, run `npm run check`, `npm run typecheck`, and `npm audit --omit=dev`. The pull request description should explain user impact, link an issue when relevant, list validation commands, and include n8n workflow details or screenshots for node-facing changes.

Use Conventional Commits, for example `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:` followed by an imperative summary.

## Release process

Add a `CHANGELOG.md` entry, then use the **Create Release** GitHub Actions workflow. It creates the version tag and GitHub Release; the publish workflow runs the checks and publishes through npm Trusted Publishers (GitHub Actions OIDC). Do not run `npm publish` locally or add npm tokens to the repository.

## Resources

- [n8n node development](https://docs.n8n.io/connect/create-nodes/build-your-node/using-the-n8n-node-tool/)
- [Soniox API documentation](https://soniox.com/docs/stt/api-reference)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
