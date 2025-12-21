# @loamly/tracker

**Open-source AI traffic detection for websites.**

> See what AI tells your customers — and track when they click.

[![npm version](https://img.shields.io/npm/v/@loamly/tracker.svg)](https://www.npmjs.com/package/@loamly/tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Part of the [Loamly](https://github.com/loamly/loamly) open-source project.

---

## The Problem

When users copy URLs from ChatGPT, Claude, or Perplexity:

- ❌ No referrer header
- ❌ No UTM parameters
- ❌ Analytics shows "Direct Traffic"

## The Solution

Loamly detects AI-referred traffic using multiple methods:

| Method | Accuracy | Description |
|--------|----------|-------------|
| **Managed Proxy** | 100% | RFC 9421 cryptographic verification |
| **Cloudflare Worker** | 100% | Self-hosted RFC 9421 verification |
| **JavaScript Tracker** | 75-90% | This package |

This tracker provides client-side detection using:

- 🔍 Referrer detection
- ⏱️ Navigation Timing API (paste vs click)
- 🧠 Behavioral signals
- 📋 Zero-party surveys

> **💡 For 100% accuracy**, combine with our edge verification. [Learn more →](https://loamly.ai/docs/security)

## Quick Start

### Script Tag

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
loamly.track('signup_started')
loamly.conversion('purchase', 99.99)
```

## API

| Method | Description |
|--------|-------------|
| `init(config)` | Initialize the tracker |
| `pageview(url?)` | Track page view |
| `track(event, options?)` | Track custom event |
| `conversion(event, revenue, currency?)` | Track conversion |
| `identify(userId, traits?)` | Identify user |
| `getAIDetection()` | Get AI detection result |
| `getNavigationTiming()` | Get paste vs click analysis |

## Privacy

- 🍪 Cookie-free
- 📍 No IP tracking
- 🔒 GDPR compliant

## Documentation

See [loamly.ai/docs](https://loamly.ai/docs) for full documentation.

## License

MIT © [Loamly](https://loamly.ai)


