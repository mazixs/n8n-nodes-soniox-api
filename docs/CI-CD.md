# CI/CD Pipeline Documentation

## Overview

This project relies on GitHub Actions to automate the following processes:
- Continuous Integration (linting + build verification)
- Automatic publishing to npm
- Release/version orchestration

---

## Workflows

### 1. `ci.yml` – Continuous Integration

**Triggers:**
- Pushes to `main` or `develop`
- Pull requests targeting these branches

**Steps:**
1. Check out the repository
2. Install Node.js 22 (LTS)
3. Install dependencies via `npm ci`
4. Lint the source (`npm run lint`)
5. Build the package (`npm run build`)
6. Verify the `dist/` directory exists

**Goal:** keep code quality high before merging

---

### 2. `create-release.yml` – Release creation

**Trigger:** Manual run (`workflow_dispatch`).

**Inputs:**
- `version` – target version (e.g., `0.6.1`)
- `prerelease` – boolean flag to mark the release as pre-release

**Steps:**
1. Validate version format (Semantic Versioning)
2. Ensure the tag does not already exist
3. Update `package.json` (and lockfile) with the new version
4. Extract release notes from `CHANGELOG.md`
5. Commit & push the version bump
6. Create and push git tag `vX.Y.Z`
7. Create the GitHub Release with extracted notes

**Outputs:**
- Git tag `vX.Y.Z`
- GitHub Release populated with CHANGELOG text

**Downstream:** creating a release automatically triggers `publish.yml`

---

### 3. `publish.yml` – npm publishing

**Triggers:**
- GitHub Release of type `published`
- Manual dispatch with `version` input

**Steps:**
1. Check out repository with full history
2. Install Node.js 22 and configure npm registry auth
3. Install dependencies (`npm ci`)
4. Lint (`npm run lint`)
5. Build (`npm run build`)
6. Confirm `dist/` exists
7. Align `package.json` version with the release tag or manual input
8. Publish to npm via `npm publish --access public`
9. Create a release branch `release/vX.Y.Z`

**Requirements:**
- GitHub secret `NPM_TOKEN`
- Publish access to the npm package namespace

**Result:**
- Package available on [npmjs.com](https://www.npmjs.com/package/n8n-nodes-soniox-api)
- Release branch `release/vX.Y.Z` pushed to the repo

---

## GitHub secrets

### Required secrets

| Secret | Purpose | Where to get it |
|--------|---------|-----------------|
| `NPM_TOKEN` | Auth token for `npm publish` | [npmjs.com → Settings → Access Tokens](https://www.npmjs.com/settings/~/tokens) |
| `GITHUB_TOKEN` | Auto-injected by GitHub Actions | Provided per workflow |

### Configuring `NPM_TOKEN`

1. Log into [npmjs.com](https://www.npmjs.com/)
2. Navigate to **Account → Access Tokens → Generate New Token**
3. Choose the **Automation** token type (intended for CI/CD)
4. Copy the token (only shown once)
5. Add it to GitHub: Settings → Secrets and variables → Actions → *New repository secret*
   - Name: `NPM_TOKEN`
   - Value: `<your_token>`

---

## Release process

### Standard flow

```
1. Develop in feature branches
   └─> open PR into develop/main
       └─> CI validates the code
           └─> merge once checks pass

2. Prepare for release
   └─> update CHANGELOG.md
       └─> run create-release.yml
           └─> GitHub Release generated
               └─> publish.yml runs automatically
                   └─> package appears on npm
```

### Semantic Versioning

- **MAJOR** (`1.0.0`): breaking changes
- **MINOR** (`0.6.0`): new backwards-compatible features
- **PATCH** (`0.6.1`): bug fixes only

**Examples:**
- `0.6.0 → 0.6.1` (bug fix)
- `0.6.0 → 0.7.0` (new functionality)
- `0.6.0 → 1.0.0` (breaking change)

---

## Branch structure

```
main/
  ├── develop (ongoing development)
  ├── feature/* (new functionality)
  ├── release/v* (auto-created during publish)
  └── hotfix/* (urgent fixes)
```

**Strategy:**
- `main` – stable production branch
- `develop` – integration branch for work in progress
- `release/vX.Y.Z` – created automatically per release

---

## Local development

### Pre-commit checklist

```bash
# Lint
npm run lint

# Autofix lint violations
npm run lintfix

# Build TypeScript + assets
npm run build

# Dry-run npm pack artifact
npm pack --dry-run
```

### Replaying CI locally

```bash
# Install act (https://github.com/nektos/act)
brew install act   # macOS
sudo apt install act  # Linux

# Run CI workflow locally
act -j lint-and-build
```

---

## Monitoring & troubleshooting

### Checking workflow status

1. **GitHub UI**
   - Repository → Actions
   - Select the workflow run
   - Inspect step-by-step logs

2. **GitHub CLI**
   ```bash
   # List runs
   gh run list

   # Inspect logs
   gh run view <run-id> --log
   ```

### Frequent issues

**Issue:** `npm publish 403 Forbidden`

**Causes:**
- `NPM_TOKEN` expired or revoked
- Account lacks publish rights to the package
- Version already published

**Fix:**
```bash
# Inspect published versions
npm view n8n-nodes-soniox-api versions

# Rotate your npm Automation token
# Update NPM_TOKEN in GitHub secrets
```

---

**Issue:** `Build failed` in CI

**Causes:**
- Lint failures
- TypeScript compilation errors
- Missing dependencies

**Fix:**
```bash
# Reproduce locally
npm ci
npm run lint
npm run build

# Confirm repo state
git status
```

---

**Issue:** Release exists but package is missing on npm

**Causes:**
- Failure inside `publish.yml`
- `NPM_TOKEN` expired

**Fix:**
1. Inspect `publish.yml` logs
2. Publish manually if needed:
   ```bash
   git checkout v0.6.1
   npm ci
   npm run build
   npm publish --access public
   ```

---

## Best practices

1. Update `CHANGELOG.md` before every release
2. Test locally before pushing
3. Use pre-releases for testing in production-like environments
4. Respect Semantic Versioning rules
5. Never skip CI checks
6. Document breaking changes explicitly in the changelog

---

## Ссылки

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
