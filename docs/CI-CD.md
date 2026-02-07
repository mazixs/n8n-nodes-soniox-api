# CI/CD Pipeline Documentation

**Updated:** 2026-02-07 (v0.7.0)

## Overview

GitHub Actions automate:
- **CI** — lint, build, audit across Node.js 18/20/22
- **Release** — version bump, tag, GitHub Release (with CI gate)
- **Publish** — dry-run → npm publish → verification

---

## Workflows

### 1. `ci.yml` — Continuous Integration

**Triggers:** push/PR to `main`/`develop`, reusable via `workflow_call`

**Key features:**
- **Node.js matrix:** 18, 20, 22 (`fail-fast: false`)
- **Concurrency:** `ci-${{ github.ref }}` — cancels duplicate runs
- **Steps:** checkout → install → lint → build → verify dist → security audit → package size check

---

### 2. `create-release.yml` — Release Creation

**Trigger:** Manual `workflow_dispatch` with `version` + `prerelease` inputs.

**Key features:**
- **CI gate:** runs full CI pipeline before release (`needs: ci`)
- **CHANGELOG validation:** blocks release if no `## [X.Y.Z]` entry exists
- **Shell injection prevention:** all user inputs via `env:` vars, not inline `${{ }}`
- **Concurrency:** `release` group (no cancel)
- **Git author:** `github-actions[bot]`
- **Idempotent commit:** skips if no changes to commit

**Flow:**
1. Run CI (matrix 18/20/22)
2. Validate version format + tag uniqueness
3. Verify CHANGELOG entry exists
4. Update `package.json` version
5. Extract release notes from CHANGELOG
6. Commit + push + tag `vX.Y.Z`
7. Create GitHub Release

**Downstream:** GitHub Release triggers `publish.yml` automatically.

---

### 3. `publish.yml` — npm Publishing

**Triggers:** GitHub Release `published` or manual `workflow_dispatch`.

**Key features:**
- **Unified version resolution:** single step handles both release tag and manual input
- **Dry-run before publish:** catches issues before actual publish
- **Post-publish verification:** checks npm registry after publish
- **Concurrency:** `publish` group (no cancel)
- **Permissions:** `contents: read` only (no write needed)

**Flow:**
1. Checkout → install → lint → build → verify dist
2. Resolve target version (from tag or input)
3. `npm publish --dry-run` (safety check)
4. `npm publish --access public`
5. Verify publication on npm registry

---

## GitHub Secrets

| Secret | Purpose | How to get |
|--------|---------|------------|
| `NPM_TOKEN` | npm publish auth | [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens) (Automation type) |
| `GITHUB_TOKEN` | Auto-injected | Provided by GitHub Actions |

---

## Release Process

```
feature branch → PR → CI validates → merge to main
                                         ↓
                              update CHANGELOG.md
                              update package.json version
                                         ↓
                              run create-release.yml
                              (CI gate → validate → tag → GitHub Release)
                                         ↓
                              publish.yml auto-triggers
                              (dry-run → publish → verify)
                                         ↓
                              package live on npm ✅
```

### Semantic Versioning

| Bump | When | Example |
|------|------|---------|
| PATCH | Bug fixes only | `0.7.0 → 0.7.1` |
| MINOR | New features (backward-compatible) | `0.7.0 → 0.8.0` |
| MAJOR | Breaking changes | `0.7.0 → 1.0.0` |

---

## Branch Structure

```
main          — stable production branch
├── develop   — integration branch
├── feature/* — new functionality
└── hotfix/*  — urgent fixes
```

---

## Local Development

```bash
# Pre-commit checklist
npm run lint          # Check code style
npm run lintfix       # Auto-fix lint issues
npm run build         # TypeScript + icons
npm audit             # Security check
npm pack --dry-run    # Preview package contents

# Replay CI locally (requires act: https://github.com/nektos/act)
act -j lint-and-build
```

---

## Troubleshooting

### `npm publish 403 Forbidden`
- `NPM_TOKEN` expired → rotate in GitHub Secrets
- Version already published → bump version
- Check: `npm view n8n-nodes-soniox-api versions`

### Build failed in CI
- Reproduce locally: `npm ci && npm run lint && npm run build`
- Check Node.js version compatibility (18/20/22)

### Release exists but package missing on npm
1. Check `publish.yml` logs in Actions tab
2. Manual publish: `git checkout vX.Y.Z && npm ci && npm run build && npm publish --access public`

---

## References

- [GitHub Actions](https://docs.github.com/en/actions)
- [npm Publishing](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
