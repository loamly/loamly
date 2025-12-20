<p align="center">
  <img src="https://loamly.ai/logo.svg" alt="Loamly" width="120" />
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

When users ask ChatGPT *"What's the best project management tool?"* and copy the recommended URL:

- ❌ **No referrer header** — browser security blocks it
- ❌ **No UTM parameters** — AI doesn't add them
- ❌ **Google Analytics shows "Direct Traffic"** — complete blind spot

**You're invisible to 15-30% of your traffic** that comes from AI conversations.

## The Solution

Loamly uses **6 revolutionary detection methods** to identify AI-referred traffic with **75-85% accuracy**:

| Method | Accuracy | Description |
|--------|----------|-------------|
| 🔍 **Referrer Detection** | 95%+ | Catches traffic from AI platforms that send referrers |
| ⏱️ **Navigation Timing API** | 65-72% | Detects paste vs click behavior patterns |
| 🤖 **RFC 9421 Verification** | 99%+ | Cryptographic verification of AI agent signatures |
| 📋 **Zero-Party Surveys** | 95%+ | Asks users "How did you find us?" |
| 🧠 **Behavioral ML** | 60-75% | AI-referred users behave differently |
| 🔗 **Temporal Matching** | 65-89% | Correlates AI bot crawls with human visits |

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@loamly/tracker`](./packages/tracker) | JavaScript tracker for websites | [![npm](https://img.shields.io/npm/v/@loamly/tracker.svg)](https://www.npmjs.com/package/@loamly/tracker) |
| [`@loamly/rfc9421-verifier`](./packages/rfc9421-verifier) | Cloudflare Worker for AI agent signature verification | — |

## Quick Start

### Script Tag (Easiest)

```html
<script 
  src="https://unpkg.com/@loamly/tracker" 
  data-api-key="your-api-key"
></script>
```

### NPM

```bash
npm install @loamly/tracker
```

```typescript
import loamly from '@loamly/tracker'

loamly.init({ apiKey: 'your-api-key' })

// Track events
loamly.track('signup_started')

// Track conversions
loamly.conversion('purchase', 99.99)
```

### Self-Hosting

You can self-host everything. See our [self-hosting guide](https://loamly.ai/docs/self-hosting).

## How It Works

### Navigation Timing Detection

When users **paste** a URL (common after copying from AI chat), the browser reveals distinctive timing patterns:

```
Paste Navigation:           Click Navigation:
navigationStart → 0ms       navigationStart → 0ms
fetchStart → ~1ms           fetchStart → ~15ms
(almost instant)            (delayed warmup)
```

### RFC 9421 Signature Verification

ChatGPT's browsing agents sign their requests using HTTP Message Signatures (RFC 9421). Our Cloudflare Worker cryptographically verifies these signatures — 99%+ accuracy for verified AI agents.

### Temporal Matching

When an AI bot crawls your site, we record it. When a human visits the same URL within minutes, we probabilistically attribute the visit to AI using Bayesian inference.

## Privacy & Compliance

- 🍪 **Cookie-free** — Uses sessionStorage
- 📍 **No IP tracking** — IPs are not stored
- 🔒 **GDPR compliant** — No personal data by default
- ✅ **No consent banner needed** — For basic analytics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Website                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  <script src="@loamly/tracker">                     │    │
│  │  - Navigation Timing detection                      │    │
│  │  - Behavioral signals                               │    │
│  │  - Event tracking                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Cloudflare Edge (Optional)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  @loamly/rfc9421-verifier                           │    │
│  │  - Verifies AI agent signatures                     │    │
│  │  - Forwards to your backend                         │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Loamly Platform                           │
│  - Temporal matching (Bayesian)                             │
│  - Dashboard & visualization                                │
│  - AI brand monitoring                                      │
│  - Historical data                                          │
└─────────────────────────────────────────────────────────────┘
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

- 💬 [GitHub Discussions](https://github.com/loamly/loamly/discussions) — Questions & ideas
- 🐛 [GitHub Issues](https://github.com/loamly/loamly/issues) — Bug reports
- 🐦 [Twitter](https://twitter.com/loamly) — Updates

## License

MIT © [Loamly](https://loamly.ai)

---

<p align="center">
  <strong>Built with ❤️ for the AI era.</strong>
</p>

<p align="center">
  <a href="https://loamly.ai">loamly.ai</a>
</p>


