<p align="center">
  <a href="https://loamly.ai">
    <img src="https://loamly.ai/loamly-coloured-logo.svg" alt="Loamly" width="140" />
  </a>
</p>

<h1 align="center">Loamly</h1>

<p align="center">
  <strong>Open-source AI traffic detection for websites</strong>
</p>

<p align="center">
  See what AI tells your customers — and track when they click.
</p>

<p align="center">
  <a href="https://github.com/loamly/loamly/stargazers"><img src="https://img.shields.io/github/stars/loamly/loamly?style=social" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@loamly/tracker"><img src="https://img.shields.io/npm/v/@loamly/tracker.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://loamly.ai">Website</a> •
  <a href="https://loamly.ai/docs">Documentation</a> •
  <a href="https://github.com/loamly/loamly/discussions">Community</a>
</p>

---

## The Problem

When users copy a URL from ChatGPT, Claude, or Perplexity:

- No referrer header (browser security blocks it)
- No UTM parameters (AI doesn't add them)
- Google Analytics shows "Direct Traffic"

This traffic is invisible. For many sites, it's 15-30% of visitors.

## The Solution

Loamly detects AI-referred traffic using multiple signals:

| Method | Accuracy | How it works |
|--------|----------|--------------|
| Navigation Timing API | 65-78% | Paste vs click detection |
| Sec-Fetch Headers | 62-74% | Browser header analysis |
| Behavioral ML | 75-90% | Mouse/scroll pattern classification |
| Focus/Blur Analysis | 55-65% | Tab switching patterns |
| Temporal Matching | 70-85% | Correlates bot crawls with visits |
| Referrer Detection | 95%+ | When AI platforms send referrers |

Combined accuracy: **~90%** for AI-influenced traffic.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@loamly/tracker`](./packages/tracker) | JavaScript tracker for websites | [![npm](https://img.shields.io/npm/v/@loamly/tracker.svg)](https://www.npmjs.com/package/@loamly/tracker) |
| [`@loamly/rfc9421-verifier`](./packages/rfc9421-verifier) | Cloudflare Worker for AI agent verification | [![npm](https://img.shields.io/npm/v/@loamly/rfc9421-verifier.svg)](https://www.npmjs.com/package/@loamly/rfc9421-verifier) |

## Quick Start

### Script Tag

```html
<script defer data-domain="your-site.com" src="https://app.loamly.ai/t.js"></script>
```

### NPM

```bash
npm install @loamly/tracker
```

```typescript
import { loamly } from '@loamly/tracker'

loamly.init({ domain: 'your-site.com' })
loamly.track('signup_started')
loamly.conversion('purchase', 99.99)
```

### Self-Hosting

You can self-host. See the [self-hosting guide](https://loamly.ai/docs/self-hosting).

## How It Works

### Navigation Timing

When users paste a URL (common after copying from AI), the browser's Performance API shows different timing patterns than clicking a link.

### Behavioral ML

AI-referred visitors behave differently: slower scroll, longer time-to-first-click, different reading patterns. A lightweight Naive Bayes classifier (~2KB) runs client-side.

### Temporal Matching

We record when AI bots crawl your site. When a human visits the same URL within minutes, we probabilistically attribute it using Bayesian inference.

## Privacy

- Cookie-free (uses sessionStorage)
- No IP storage
- GDPR compliant by default
- No consent banner needed for basic analytics

## Architecture

```
Your Website
└── <script src="app.loamly.ai/t.js">
    ├── Navigation Timing detection
    ├── Behavioral ML classification  
    ├── Focus/Blur analysis
    └── Event tracking
              │
              ▼
Loamly Platform (or self-hosted)
├── Temporal matching (Bayesian)
├── Bot crawl correlation
├── Dashboard
└── AI brand monitoring
```

## Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone
git clone https://github.com/loamly/loamly.git
cd loamly

# Install
pnpm install

# Build all packages
pnpm build

# Development mode
pnpm dev
```

## Community

- [GitHub Discussions](https://github.com/loamly/loamly/discussions) — Questions & ideas
- [GitHub Issues](https://github.com/loamly/loamly/issues) — Bug reports

## License

MIT © [Loamly](https://loamly.ai)

---

<p align="center">
  <a href="https://loamly.ai">loamly.ai</a>
</p>

