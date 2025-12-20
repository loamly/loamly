# Contributing to Loamly

First off, thank you for considering contributing to Loamly! 🎉

## Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/loamly.git
cd loamly
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Build all packages**

```bash
pnpm build
```

4. **Start development mode**

```bash
pnpm dev
```

## Project Structure

```
loamly/
├── packages/
│   ├── tracker/          # @loamly/tracker - JavaScript tracker
│   └── rfc9421-verifier/ # Cloudflare Worker for signature verification
├── .github/workflows/    # CI/CD
├── package.json          # Root workspace config
├── pnpm-workspace.yaml   # pnpm workspace config
└── turbo.json            # Turborepo config
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning:

```
feat: add new detection method
fix: resolve memory leak in scroll tracking
perf: optimize event batching
docs: update API reference
refactor: simplify navigation timing logic
test: add unit tests for referrer detection
chore: update dependencies
```

**Breaking changes:** Add `BREAKING CHANGE:` in the commit body.

## Package-Specific Contributions

### @loamly/tracker

The JavaScript tracker is the core of Loamly. When contributing:

- Keep bundle size small (target: <10KB minified)
- Test in multiple browsers
- Ensure privacy-first approach (no cookies, no PII)

### @loamly/rfc9421-verifier

The Cloudflare Worker for signature verification. When contributing:

- Test with Wrangler locally
- Ensure cryptographic operations are correct
- Keep latency minimal

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `pnpm test`
4. Run type check: `pnpm typecheck`
5. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Questions?

Open a [Discussion](https://github.com/loamly/loamly/discussions) or reach out at hello@loamly.ai

---

Thank you for making Loamly better! 🙌

