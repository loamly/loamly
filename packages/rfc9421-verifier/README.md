# @loamly/rfc9421-verifier

**Cloudflare Worker for RFC 9421 HTTP Message Signatures verification.**

Cryptographically verify AI agent requests from ChatGPT, Claude, and other LLMs.

Part of the [Loamly](https://github.com/loamly/loamly) open-source project.

---

## What This Does

When ChatGPT's browsing mode visits your website, it signs requests using [RFC 9421 HTTP Message Signatures](https://datatracker.ietf.org/doc/html/rfc9421). This Cloudflare Worker:

1. **Intercepts** all requests at the edge
2. **Verifies** cryptographic signatures from AI agents
3. **Forwards** verified events to Loamly for analytics
4. **Passes through** the request to your origin (no latency added)

## Detection Methods

| Tier | Method | Accuracy |
|------|--------|----------|
| 1 | RFC 9421 signature verification | 99%+ |
| 2 | Manual Ed25519 with embedded keys | 99%+ |
| 3 | User-Agent pattern matching | 90%+ |

## Supported AI Agents

- ✅ ChatGPT (GPTBot, ChatGPT-User)
- ✅ Claude (ClaudeBot, anthropic-ai)
- ✅ Perplexity (PerplexityBot)
- ✅ Google Gemini (Google-Extended)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/loamly/loamly.git
cd loamly/packages/rfc9421-verifier
pnpm install
```

### 2. Configure

Set environment variables in Cloudflare dashboard or `wrangler.toml`:

```toml
[vars]
LOAMLY_WORKSPACE_ID = "your-workspace-id"
LOAMLY_WORKSPACE_API_KEY = "your-api-key"
LOAMLY_INGEST_URL = "https://app.loamly.ai/api/ingest/edge-visit"
```

### 3. Deploy

```bash
pnpm deploy
```

### 4. Add Route

In Cloudflare dashboard, add a Worker Route:
- Route: `yourdomain.com/*`
- Worker: `loamly-rfc9421-verifier`

## How RFC 9421 Works

ChatGPT signs requests with Ed25519 keys:

```http
GET /product/123 HTTP/1.1
Host: example.com
Signature-Agent: "https://chatgpt.com"
Signature-Input: sig1=("@authority" "@method" "signature-agent");created=1728000000;keyid="abc123";alg="ed25519"
Signature: sig1=:base64signature:
```

The Worker:
1. Extracts the signature and key ID
2. Fetches the public key from OpenAI's JWKS endpoint
3. Verifies the Ed25519 signature
4. Forwards the verified event to Loamly

## Self-Hosting

This Worker can be used standalone without Loamly. Modify the `handleVerification` function to send events to your own analytics backend.

## API

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LOAMLY_WORKSPACE_ID` | Yes | Your Loamly workspace ID |
| `LOAMLY_WORKSPACE_API_KEY` | Yes | Your Loamly API key |
| `LOAMLY_INGEST_URL` | No | Custom ingest endpoint |
| `FORWARD_UNSIGNED` | No | Forward unsigned AI requests |

### Event Payload

Events sent to the ingest endpoint:

```json
{
  "workspace_id": "...",
  "landing_page": "https://example.com/product/123",
  "user_agent": "ChatGPT-User/1.0",
  "signature_verified": true,
  "signature_agent": "https://chatgpt.com",
  "signature_key_id": "abc123...",
  "verification_method": "rfc9421",
  "timestamp": "2025-12-20T10:30:00Z"
}
```

## License

MIT © [Loamly](https://loamly.ai)


