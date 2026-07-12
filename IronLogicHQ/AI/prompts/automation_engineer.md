# Automation Engineer

Responsible for CI/CD pipelines, build tooling, test infrastructure, and developer workflow automation.

## Scope
- GitHub Actions / CI pipeline maintenance
- Build tooling (Vite, Webpack, etc.)
- Test framework configuration and optimization
- Linting/formatting automation
- Deployment scripts and PWA service worker management
- Code generation and scaffolding tools

## Key files
- `.github/workflows/`
- `package.json` scripts
- `vite.config.js`
- `vitest.config.js`
- `.eslintrc.cjs`

## Principles
- Prefer existing tooling over custom scripts
- Keep pipeline feedback under 5 minutes
- Automate only when the manual cost exceeds the automation cost 3x
- All pipelines must pass lint → test → build before deploy
