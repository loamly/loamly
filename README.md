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
  Know when ChatGPT, Claude, Perplexity, and Gemini visit your site.<br />
  Cryptographic verification. Zero false positives.
</p>

<p align="center">
  <a href="https://github.com/loamly/loamly/stargazers"><img src="https://img.shields.io/github/stars/loamly/loamly?style=social" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@loamly/tracker"><img src="https://img.shields.io/npm/v/@loamly/tracker.svg" alt="npm tracker"></a>
  <a href="https://www.npmjs.com/package/@loamly/rfc9421-verifier"><img src="https://img.shields.io/npm/v/@loamly/rfc9421-verifier.svg" alt="npm verifier"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://loamly.ai">Website</a> •
  <a href="https://loamly.ai/docs">Documentation</a> •
  <a href="https://loamly.ai/docs/security">Security</a> •
  <a href="https://github.com/loamly/loamly/discussions">Community</a>
</p>

---

## The Problem

When users copy a URL from ChatGPT, Claude, or Perplexity:

- ❌ No referrer header (browser security blocks it)
- ❌ No UTM parameters (AI doesn't add them)
- ❌ Google Analytics shows "Direct Traffic"

This traffic is **invisible**. For many sites, it's 15-30% of visitors.

## The Solution

Loamly detects AI traffic using **RFC 9421 cryptographic signatures** — the same standard used by OpenAI, Anthropic, and Google for their AI agents.

### Detection Methods

| Method | Accuracy | Description |
|--------|----------|-------------|
| **RFC 9421 Signatures** | 100% | Cryptographic Ed25519 verification |
| Navigation Timing | 65-78% | Paste vs click detection |
| Behavioral ML | 75-90% | Mouse/scroll pattern classification |
| User-Agent | 95%+ | Known AI bot patterns |

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@loamly/tracker`](./packages/tracker) | JavaScript tracker for websites | [![npm](https://img.shields.io/npm/v/@loamly/tracker.svg)](https://www.npmjs.com/package/@loamly/tracker) |
| [`@loamly/rfc9421-verifier`](./packages/rfc9421-verifier) | Cloudflare Worker for signature verification | [![npm](https://img.shields.io/npm/v/@loamly/rfc9421-verifier.svg)](https://www.npmjs.com/package/@loamly/rfc9421-verifier) |

## Quick Start

### Option 1: Script Tag (Simplest)

```html
<script defer data-domain="your-site.com" src="https://app.loamly.ai/t.js"></script>
```

### Option 2: NPM Package

```bash
npm install @loamly/tracker
```

```typescript
import { loamly } from '@loamly/tracker'

loamly.init({ domain: 'your-site.com' })
loamly.track('signup_started')
loamly.conversion('purchase', 99.99)
```

### Option 3: RFC 9421 Verification (100% Accuracy)

Deploy our Cloudflare Worker for cryptographic AI bot verification:

```bash
git clone https://github.com/loamly/loamly.git
cd loamly/packages/rfc9421-verifier

# Set your secrets
npx wrangler secret put LOAMLY_WORKSPACE_ID
npx wrangler secret put LOAMLY_WORKSPACE_API_KEY

# Deploy
npx wrangler deploy
```

Or use our **Managed Proxy** — just point your DNS:

```
your-domain.com  A  37.16.7.18
```

We handle SSL, verification, and proxying automatically. [Learn more →](https://loamly.ai/docs/security)

## How RFC 9421 Verification Works

When ChatGPT or Claude visits your site, they sign their requests with Ed25519 signatures:

```
Signature: sig1=:MEQCIFvN...base64...:
Signature-Input: sig1=("@method" "@target-uri" "@authority");created=1734567890;keyid="..."
```

We verify these signatures against OpenAI's public keys (JWKS). No heuristics. No false positives.

```
User → your-domain.com
    → Loamly Proxy (or Cloudflare Worker)
    → Verify RFC 9421 Signature
    → Forward to Origin (unchanged)
```

## Privacy

- 🔒 **No cookies** (uses sessionStorage)
- 🔒 **No IP storage** (hashed for deduplication, then discarded)
- 🔒 **GDPR compliant** by default
- 🔒 **No consent banner needed** for basic analytics

See our [Security & Trust documentation](https://loamly.ai/docs/security).

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
Edge Verification (Cloudflare Worker or Managed Proxy)
├── RFC 9421 signature verification
├── Ed25519 cryptographic validation
├── AI bot User-Agent detection
└── Cookie attribution
              │
              ▼
Loamly Platform (or self-hosted)
├── Temporal matching (Bayesian)
├── Bot crawl correlation
├── Dashboard
└── AI brand monitoring
```

## Self-Hosting

You can self-host everything. See the [self-hosting guide](https://loamly.ai/docs/self-hosting).

## Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

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

## Supported AI Agents

| Agent | Signature Verification | User-Agent Detection |
|-------|----------------------|---------------------|
| ChatGPT / OpenAI | ✅ RFC 9421 | ✅ `ChatGPT-User`, `GPTBot` |
| Claude / Anthropic | 🔜 Coming | ✅ `ClaudeBot`, `Claude-User` |
| Perplexity | 🔜 Coming | ✅ `PerplexityBot` |
| Google Gemini | 🔜 Coming | ✅ `Google-Extended` |

## Community

- [GitHub Discussions](https://github.com/loamly/loamly/discussions) — Questions & ideas
- [GitHub Issues](https://github.com/loamly/loamly/issues) — Bug reports

## License

MIT © [Loamly](https://loamly.ai)

---

<p align="center">
  <a href="https://loamly.ai">loamly.ai</a> · <a href="https://loamly.ai/docs/security">Security</a> · <a href="https://twitter.com/loamlyai">Twitter</a>
</p>
