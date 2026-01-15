# @loamly/tracker

**See every AI bot that visits your website — and what they tell users about you.**

ChatGPT, Claude, Perplexity, Gemini — know when they crawl your pages or refer traffic.

[![npm](https://img.shields.io/npm/v/@loamly/tracker)](https://www.npmjs.com/package/@loamly/tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Why This Exists

**75-85% of AI-referred traffic is invisible** to traditional analytics. Users copy-paste from ChatGPT or type URLs from Perplexity — no referrer, no UTM, no attribution.

This tracker uses multiple detection methods to identify AI-influenced visits:

| Method | Accuracy | What It Detects |
|--------|----------|-----------------|
| Navigation Timing API | 85% | Paste vs click (instant navigation = copy-paste) |
| Focus/Blur Sequence | 80% | Paste pattern (focus → immediate navigation) |
| Behavioral ML | 78% | Mouse patterns, scroll velocity, dwell time |
| Agentic Browser Detection | 92% | CDP automation, Perplexity Comet DOM |
| AI Referrer/UTM | 100% | Direct referrals from AI platforms |

Combined with [@loamly/edge](../edge/) for server-side detection, you get **75-85% total accuracy**.

## Quick Start

### Option 1: CDN (Recommended)

```html
<script src="https://cdn.jsdelivr.net/npm/@loamly/tracker@2/dist/loamly.iife.min.global.js"></script>
<script>
  Loamly.init({ apiKey: 'your-api-key', workspaceId: 'your-workspace-uuid' });
</script>
```

### Option 2: npm

```bash
npm install @loamly/tracker
```

```typescript
import { loamly } from '@loamly/tracker';

loamly.init({ apiKey: 'your-api-key', workspaceId: 'your-workspace-uuid' });
```

## Features

### 🔍 Multi-Signal AI Detection

```typescript
// Check current detection results
const ai = loamly.getAIDetection();
console.log(ai);
// { isAI: true, platform: 'chatgpt', confidence: 0.85, method: 'behavioral' }

const timing = loamly.getNavigationTiming();
console.log(timing);
// { nav_type: 'likely_paste', confidence: 0.92, signals: ['instant_fetch_start'] }

const behavioral = loamly.getBehavioralML();
console.log(behavioral);
// { classification: 'ai_influenced', humanProbability: 0.23, aiProbability: 0.77 }
```

### 📊 Advanced Behavioral Tracking

- **Scroll Depth**: 30% chunk reporting (30%, 60%, 90%, 100%)
- **Time Spent**: Active vs idle time, engagement detection
- **Form Tracking**: HubSpot, Typeform, JotForm, native forms
- **SPA Support**: Automatic History API detection

### 🤖 Agentic Browser Detection

Detects AI agents that browse on behalf of users:

```typescript
const agentic = loamly.getAgentic();
console.log(agentic);
// { 
//   cometDOMDetected: true,      // Perplexity Comet overlay
//   cdpDetected: false,           // Chrome DevTools Protocol
//   mousePatterns: { teleportingClicks: 0 },
//   agenticProbability: 0.85
// }
```

### ⚡ Production Infrastructure

- **Event Queue**: Batching, retry with exponential backoff, localStorage persistence
- **Ping Service**: 30-second heartbeat for active sessions
- **Beacon Fallback**: Reliable event delivery on page unload
- **Offline Support**: Events queued when offline, synced when back

## API Reference

### `init(config)`

Initialize the tracker with configuration.

```typescript
loamly.init({
  apiKey: 'your-api-key',           // Required
  workspaceId: 'your-workspace-uuid', // Required for public tracker keys
  apiHost: 'https://app.loamly.ai', // Optional: custom host
  debug: true,                    // Optional: enable console logging
  disableAutoPageview: false,     // Optional: disable auto pageview
  disableBehavioral: false,       // Optional: disable behavioral tracking
});
```

### Lightweight Mode

Disable specific features to reduce CPU/memory overhead:

```typescript
loamly.init({
  apiKey: 'your-api-key',
  features: {
    scroll: true,       // Scroll depth tracking (default: true)
    time: true,         // Time on page tracking (default: true)
    forms: true,        // Form interaction tracking (default: true)
    spa: true,          // SPA navigation support (default: true)
    behavioralML: false, // Behavioral ML classification (default: true) - saves ~2KB CPU
    focusBlur: true,    // Focus/blur paste detection (default: true)
    agentic: false,     // Agentic browser detection (default: true) - saves ~1.5KB CPU
    eventQueue: true,   // Event queue with retry (default: true)
    ping: false,        // Heartbeat ping service (default: false - opt-in)
  }
});
```

**Note:** All features are included in the bundle (~11KB gzipped). The `features` config only affects runtime initialization, not download size.

### `track(eventName, options?)`

Track a custom event.

```typescript
loamly.track('button_click', {
  properties: { buttonId: 'cta-hero' },
});
```

### `conversion(eventName, revenue, currency?)`

Track a conversion with revenue.

```typescript
loamly.conversion('purchase', 99.99, 'USD');
```

### `identify(userId, traits?)`

Identify a user for cross-session tracking.

```typescript
loamly.identify('user-123', {
  email: 'user@example.com',
  plan: 'pro',
});
```

### `pageview(url?)`

Manually track a pageview (useful for SPAs).

```typescript
loamly.pageview('/dashboard');
```

## Privacy

- **Cookie-free**: Uses localStorage for visitor/session ID
- **GDPR-friendly**: No personal data stored by default
- **Opt-out support**: Can be disabled via config
- **Open source**: Audit the code yourself

## Combine with Edge Detection

For 100% accurate detection of ChatGPT Agent Mode and other signed bots, combine with [@loamly/edge](../edge/):

```
┌─────────────────────────────────────────────┐
│              @loamly/edge                   │
│    Cloudflare Worker (server-side)          │
│    → 100% for signed bots (RFC 9421)        │
│    → 95% for all AI crawlers                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            @loamly/tracker                  │
│      Browser tracker (client-side)          │
│    → Paste detection, behavioral ML         │
│    → Agentic browser detection              │
└─────────────────────────────────────────────┘
                    ↓
        75-85% total detection accuracy
```

## License

MIT © [Loamly](https://loamly.ai)
