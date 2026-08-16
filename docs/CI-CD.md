# CI/CD

Updated 2026-08-16 for the `0.8.x` toolchain.

## Workflows

### `ci.yml`

Runs on pushes and pull requests to `main` and `develop`, and can be called by the release workflow. The matrix uses Node.js `22.22.0` and `24` and runs:

```text
npm ci
npm run check
npm run typecheck
npm audit --omit=dev
npm pack --dry-run
```

`npm run check` performs the n8n community-node lint, unit tests, build, and package dry-run.

### `create-release.yml`

Manual release workflow. It runs CI first, validates the semantic version and changelog entry, updates the package version, commits the release version, creates tag `vX.Y.Z`, and opens a GitHub Release. Publishing starts when that release is published.

### `publish.yml`

Publishes on a published GitHub Release or by manual dispatch. It uses npm Trusted Publishers with GitHub Actions OIDC:

- `permissions.id-token: write` and `contents: read`;
- Node.js `24` and npm registry configuration;
- no `NPM_TOKEN` and no `NODE_AUTH_TOKEN`;
- dry-run, real publish, and registry verification.

Configure the trusted publisher in npm package settings with:

```text
Owner: mazixs
Repository: n8n-nodes-soniox-api
Workflow filename: publish.yml
```

This configuration is external to the repository and must be completed before the first OIDC publish. npm Trusted Publishers require a current npm CLI and a supported GitHub-hosted runner.

## Local checks

```bash
npm ci
npm run lint
npm test
npm run build
npm run typecheck
npm pack --dry-run
npm audit --omit=dev
```

Do not add npm tokens to GitHub Secrets or commit credentials. The automatically provided `GITHUB_TOKEN` is used only by the release workflow to push its version commit, tag, and release.
