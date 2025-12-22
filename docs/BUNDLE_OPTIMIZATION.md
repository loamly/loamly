# Loamly Tracker Bundle Optimization

## Current State (v2.0.2)

| Metric | Size |
|--------|------|
| Minified | 37KB |
| Gzipped | 10.99KB |
| Brotli | 9.80KB |

**Comparison:**
- Plausible: 1.32KB gzipped (pageviews only)
- Fathom: 1.78KB gzipped (pageviews + scroll)
- Segment: 26.6KB gzipped (full SDK)
- **Loamly: 10.99KB gzipped** (comprehensive AI detection)

## Recommended Architecture: Core + Lazy Modules

### Core Bundle (Target: 5-7KB gzipped)
Essential features that load immediately:

```
src/
├── core-lite.ts       # Minimal init, pageview, track
├── config.ts          # Configuration
├── utils.ts           # Shared utilities
├── detection/
│   ├── referrer.ts    # AI referrer detection (lightweight)
│   └── navigation-timing.ts # Browser API read (lightweight)
└── types.ts
```

**Core includes:**
- ✅ Initialization & configuration
- ✅ Session/visitor ID management
- ✅ Pageview tracking
- ✅ Custom event tracking
- ✅ AI referrer detection (simple regex)
- ✅ Navigation timing (browser API read)
- ✅ Basic fetch for events

### Lazy Modules (Load on demand)

| Module | Size | Trigger |
|--------|------|---------|
| `scroll-tracker` | ~0.8KB | First scroll |
| `time-tracker` | ~0.8KB | 5s after init |
| `form-tracker` | ~1.5KB | Form detected |
| `focus-blur` | ~1KB | 2s after init |
| `behavioral-classifier` | ~2KB | 10s after init |
| `agentic-browser` | ~1.5KB | Configurable |
| `event-queue` | ~1KB | Network failure |
| `ping` | ~0.7KB | Config enabled |
| `spa-router` | ~0.7KB | SPA detected |

## Implementation Options

### Option A: Dynamic Imports (Recommended)

```typescript
// core.ts
async function loadBehavioralML() {
  const { BehavioralClassifier } = await import('./detection/behavioral-classifier')
  return new BehavioralClassifier()
}

// Load after 10 seconds
setTimeout(async () => {
  behavioralClassifier = await loadBehavioralML()
}, 10000)
```

**Pros:**
- Browser-native lazy loading
- Automatic code splitting
- Cache-friendly

**Cons:**
- Requires bundler config changes
- Multiple network requests

### Option B: Single Bundle with Feature Flags

```typescript
// Keep single bundle but allow disabling features
loamly.init({
  features: {
    scroll: true,       // Default: true
    forms: true,        // Default: true
    behavioralML: false, // Default: false (opt-in)
    agentic: false,     // Default: false (opt-in)
  }
})
```

**Pros:**
- Simple to implement
- Single request
- No bundler changes

**Cons:**
- Full bundle always downloaded
- Dead code not eliminated

### Option C: Separate Bundles (PostHog approach)

```
loamly.core.min.js     # 5KB gzipped - core tracking
loamly.full.min.js     # 11KB gzipped - everything
loamly.lite.min.js     # 3KB gzipped - pageviews only
```

**Pros:**
- Clear size options
- Customer chooses bundle

**Cons:**
- Multiple artifacts to maintain
- CDN complexity

## Quick Wins (No Architecture Changes)

### 1. Remove Debug Logging in Production
```typescript
// Before
function log(...args: unknown[]): void {
  if (debugMode) {
    console.log('[Loamly]', ...args)
  }
}

// After: Use build-time constant
declare const __DEV__: boolean
function log(...args: unknown[]): void {
  if (__DEV__ && debugMode) console.log('[Loamly]', ...args)
}
```
**Savings:** ~0.5KB

### 2. Shorter Variable Names (minifier handles this)
Already handled by Terser.

### 3. Remove Duplicate Type Guards
```typescript
// Consolidate similar checks
const isBrowser = typeof window !== 'undefined'
const hasPerformance = isBrowser && 'performance' in window
```

### 4. Use Smaller Patterns
```typescript
// Before
new Date().toISOString()

// After (same result, slightly smaller)
Date.now()  // If only timestamp needed
```

## Priority Recommendation

### Phase 1: Optimize Current Bundle (1-2 days)
- [ ] Remove dead code paths
- [ ] Consolidate duplicate patterns
- [ ] Optimize type guards
- **Target:** 9KB gzipped

### Phase 2: Feature Flags (3-5 days)
- [ ] Add `features` config option
- [ ] Conditional initialization
- [ ] Tree-shake disabled features
- **Target:** 6KB core, 11KB full

### Phase 3: Lazy Loading (1-2 weeks)
- [ ] Split into core + modules
- [ ] Implement dynamic imports
- [ ] Update CDN distribution
- **Target:** 5KB core, modules on-demand

## Conclusion

**Current 10.99KB gzipped is already competitive** for a comprehensive tracker with:
- All Tier 4 detection methods
- Form tracking (HubSpot, Typeform, etc.)
- Behavioral ML classification
- Agentic browser detection
- SPA support

For reference, Google Analytics 4 is 67KB gzipped and provides fewer detection capabilities.

**Recommendation:** Implement Phase 1 quick wins to reach ~9KB, then Phase 2 feature flags for customers who want minimal footprint.

