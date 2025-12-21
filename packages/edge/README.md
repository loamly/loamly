# @loamly/edge

**See every AI bot that visits your website.**

ChatGPT, Claude, Perplexity, Gemini — know when they crawl your pages or when users browse through them.

[![npm version](https://img.shields.io/npm/v/@loamly/edge.svg)](https://www.npmjs.com/package/@loamly/edge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Part of the [Loamly](https://github.com/loamly/loamly) open-source project.

---

## Why This Matters

AI bots are visiting your site right now. They're:

- 🤖 **Crawling** your content for training (GPTBot, ClaudeBot)
- 🔍 **Searching** on behalf of users (Perplexity, ChatGPT browsing)
- 🧑‍💻 **Browsing** through agentic interfaces (ChatGPT Agent Mode)

Without edge detection, this traffic is **invisible** in your analytics.

## What You'll See

```
Today's AI Visitors:
├── ChatGPT Agent Mode    47 visits  (verified ✓)
├── GPTBot Crawler        892 pages  (User-Agent)
├── ClaudeBot             234 pages  (User-Agent)
├── PerplexityBot         156 pages  (User-Agent)
└── Unknown AI            23 visits  (behavioral)
```

## Detection Methods

| Method | Accuracy | What it catches |
|--------|----------|-----------------|
| **Cryptographic signatures** | 100% | ChatGPT Agent Mode (RFC 9421 signed) |
| **User-Agent patterns** | 95%+ | All major AI crawlers and bots |
| **Behavioral analysis** | 90%+ | Unknown AI bots |

## Quick Start

### Option 1: Managed Proxy (Recommended)

Just point your DNS — we handle everything:

```
your-domain.com  A  37.16.7.18
```

SSL, verification, and proxying handled automatically. [Security details →](https://loamly.ai/docs/security)

### Option 2: Self-Hosted Cloudflare Worker

```bash
git clone https://github.com/loamly/loamly.git
cd loamly/packages/edge

# Set your secrets
npx wrangler secret put LOAMLY_WORKSPACE_ID
npx wrangler secret put LOAMLY_WORKSPACE_API_KEY

# Deploy
npx wrangler deploy
```

Then add a Worker Route in Cloudflare:
- Route: `yourdomain.com/*`
- Worker: `loamly-edge`

## How It Works

```
User/Bot Request
      │
      ▼
┌─────────────────────────────────┐
│  Loamly Edge (this package)     │
│  ─────────────────────────────  │
│  1. Check for RFC 9421 sig      │ ← ChatGPT Agent Mode
│  2. Check User-Agent patterns   │ ← GPTBot, ClaudeBot, etc.
│  3. Analyze request behavior    │ ← Unknown bots
│  4. Forward verified events     │ → Loamly Dashboard
└─────────────────────────────────┘
      │
      ▼
  Your Origin (unchanged)
```

**Zero latency added** — verification happens in parallel with the request.

## Supported AI Bots

### Crawlers (content scraping)

| Bot | Company | Detection |
|-----|---------|-----------|
| GPTBot | OpenAI | User-Agent |
| ChatGPT-User | OpenAI | User-Agent + Signature |
| ClaudeBot | Anthropic | User-Agent |
| Claude-User | Anthropic | User-Agent |
| PerplexityBot | Perplexity | User-Agent |
| Google-Extended | Google | User-Agent |

### Agentic Browsers (user-initiated)

| Bot | Feature | Detection |
|-----|---------|-----------|
| ChatGPT Agent Mode | "Browse with Bing" | RFC 9421 Signature ✓ |
| Claude Computer Use | Browser automation | Coming soon |
| Perplexity Pro Search | Live web search | User-Agent |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LOAMLY_WORKSPACE_ID` | Yes | Your Loamly workspace ID |
| `LOAMLY_WORKSPACE_API_KEY` | Yes | Your Loamly API key |
| `LOAMLY_INGEST_URL` | No | Custom ingest endpoint (default: app.loamly.ai) |

### Event Payload

Events sent to Loamly:

```json
{
  "landing_page": "https://example.com/product/123",
  "bot_type": "chatgpt_agent",
  "detection_method": "rfc9421_signature",
  "signature_verified": true,
  "user_agent": "ChatGPT-User/1.0",
  "country": "US",
  "timestamp": "2025-12-21T10:30:00Z"
}
```

> **Privacy:** IP addresses are hashed for visitor deduplication, then discarded. Only country is stored.

## Self-Hosting Without Loamly

This Worker can send events to your own backend. Modify the `sendToIngest` function:

```typescript
async function sendToIngest(event: AIVisitEvent) {
  await fetch('https://your-backend.com/ai-visits', {
    method: 'POST',
    body: JSON.stringify(event)
  });
}
```

## License

MIT © [Loamly](https://loamly.ai)

---

<p align="center">
  <a href="https://loamly.ai/docs/security">Security</a> · 
  <a href="https://loamly.ai/docs">Docs</a> · 
  <a href="https://github.com/loamly/loamly">GitHub</a>
</p>
