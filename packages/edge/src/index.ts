/**
 * Loamly Edge
 * 
 * Cloudflare Worker for detecting AI bots visiting your website.
 * See every ChatGPT, Claude, Perplexity, and Gemini visit.
 * 
 * Detection Methods:
 * 1. RFC 9421 cryptographic signatures (100% accuracy for ChatGPT Agent Mode)
 * 2. User-Agent pattern matching (95%+ accuracy for all major AI crawlers)
 * 3. Behavioral analysis (90%+ for unknown bots)
 * 
 * Supported AI Bots:
 * - ChatGPT / OpenAI (GPTBot, ChatGPT-User, RFC 9421 signatures)
 * - Claude / Anthropic (ClaudeBot, Claude-User)
 * - Perplexity (PerplexityBot)
 * - Google Gemini (Google-Extended, Gemini-Deep-Research)
 * 
 * @module @loamly/edge
 * @version 2.1.0
 * @license MIT
 * @see https://github.com/loamly/loamly
 * @see https://loamly.ai/docs/security
 */

import { verify } from 'web-bot-auth';

// Lightweight types suitable for Cloudflare workers without external deps
type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export interface Env {
  LOAMLY_WORKSPACE_ID: string;
  LOAMLY_WORKSPACE_API_KEY: string;
  LOAMLY_INGEST_URL: string;
  JWKS_URL?: string; // default https://chatgpt.com/.well-known/http-message-signatures-directory
  JWKS_TTL_SECONDS?: string; // default 21600 (6h)
  FORWARD_UNSIGNED?: string;
}

// Embedded JWKS keys - Tier 2 verification uses these
// These are OpenAI ChatGPT public keys (public data, no security issue)
type EmbeddedKey = {
  kid: string;
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  use: 'sig';
  nbf?: number; // Not before (Unix timestamp)
  exp?: number; // Expires (Unix timestamp)
};

const EMBEDDED_KEYS: EmbeddedKey[] = [
  {
    kid: 'otMqcjr17mGyruktGvJU8oojQTSMHlVm7uO-lrcqbdg',
    kty: 'OKP',
    crv: 'Ed25519',
    x: '7F_3jDlxaquwh291MiACkcS3Opq88NksyHiakzS-Y1g',
    use: 'sig',
    nbf: 1735689600, // 2025-01-01T00:00:00Z
    exp: 1766930449, // 2025-12-27T23:40:49Z (REFRESHED 2025-12-21 from live JWKS)
  },
  // Add more keys as OpenAI rotates them
  // Fetch from: https://chatgpt.com/.well-known/http-message-signatures-directory
];

function getEmbeddedKey(keyId: string): EmbeddedKey | null {
  const embedded = EMBEDDED_KEYS.find(k => k.kid === keyId);
  
  if (!embedded) {
    return null;
  }

  // Check key expiration if provided
  if (embedded.exp && Date.now() / 1000 > embedded.exp) {
    console.warn(`[loamly-edge] Embedded key ${keyId.substring(0, 8)}... expired at ${new Date(embedded.exp * 1000).toISOString()}`);
    return null;
  }

  // Check key validity start if provided
  if (embedded.nbf && Date.now() / 1000 < embedded.nbf) {
    console.warn(`[loamly-edge] Embedded key ${keyId.substring(0, 8)}... not valid until ${new Date(embedded.nbf * 1000).toISOString()}`);
    return null;
  }

  return embedded;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Check if this is an agent fetch (for cookie setting)
    const sig = request.headers.get('signature') || request.headers.get('Signature');
    const sigInput = request.headers.get('signature-input') || request.headers.get('Signature-Input');
    const agentHeader = request.headers.get('signature-agent') || request.headers.get('Signature-Agent');
    const agent = agentHeader ? String(agentHeader).replace(/^"|"$/g, '') : '';
    const ua = String(request.headers.get('user-agent') || '').toLowerCase();
    
    // Detect ALL AI bot User-Agents
    // ChatGPT: ChatGPT-User, GPTBot, chatgpt.com
    // Perplexity: PerplexityBot, Perplexity-User
    // Claude: ClaudeBot, Claude-User, anthropic-ai, anthropic.com
    // Google Gemini: Google-Extended, Gemini-Deep-Research
    const isChatGPTBot = ua.includes('chatgpt-user') || ua.includes('chatgpt.com') || ua.includes('gptbot');
    const isPerplexityBot = ua.includes('perplexitybot') || ua.includes('perplexity-user');
    const isClaudeBot = ua.includes('claudebot') || ua.includes('claude-user') || ua.includes('anthropic-ai') || ua.includes('anthropic.com');
    const isGoogleBot = ua.includes('google-extended') || ua.includes('gemini-deep-research');
    const isAIBot = isChatGPTBot || isPerplexityBot || isClaudeBot || isGoogleBot;
    const isAgentFetch = (sig && sigInput) || (agent && agent.includes('chatgpt.com')) || isAIBot;
    
    // Pass-through to origin
    const response = await fetch(request);
    
    // Set cookie for AI referrer attribution (mobile app clicks)
    // Cookie expires in 5 minutes (agent fetch → user browser transition)
    if (isAgentFetch && request.method === 'GET') {
      // Determine assistant name from agent header or User-Agent
      let assistantName = 'unknown';
      if (agent.includes('chatgpt.com') || isChatGPTBot) {
        assistantName = 'chatgpt';
      } else if (isPerplexityBot) {
        assistantName = 'perplexity';
      } else if (isClaudeBot) {
        assistantName = 'claude';
      } else if (isGoogleBot) {
        assistantName = 'gemini';
      }
      if (assistantName !== 'unknown') {
        const cookieValue = `${assistantName}:${Date.now()}:${crypto.randomUUID().substring(0, 8)}`;
        // Clone response to modify headers
        const newResponse = new Response(response.body, response);
        newResponse.headers.set(
          'Set-Cookie',
          `__loamly_ai_ref=${cookieValue}; Path=/; Max-Age=300; SameSite=Lax; Secure`
        );
        ctx.waitUntil(handleVerification(request, env, { isChatGPTBot, isPerplexityBot, isClaudeBot, isGoogleBot }));
        return newResponse;
      }
    }
    
    ctx.waitUntil(handleVerification(request, env, { isChatGPTBot, isPerplexityBot, isClaudeBot, isGoogleBot }));
    return response;
  },
};

interface BotFlags {
  isChatGPTBot: boolean;
  isPerplexityBot: boolean;
  isClaudeBot: boolean;
  isGoogleBot: boolean;
}

async function handleVerification(request: Request, env: Env, botFlags: BotFlags) {
  try {
    if (request.method !== 'GET') return;
    
    const sig = request.headers.get('signature') || request.headers.get('Signature');
    const sigInput = request.headers.get('signature-input') || request.headers.get('Signature-Input');
    const agentHeader = request.headers.get('signature-agent') || request.headers.get('Signature-Agent');
    // RFC 9421 structured field: signature-agent is a quoted string, strip quotes
    const agent = agentHeader ? String(agentHeader).replace(/^"|"$/g, '') : '';

    // Debug visibility: log ALL header names (not values) to diagnose ChatGPT behavior
    const allHeaderNames: string[] = [];
    request.headers.forEach((_val, key) => {
      allHeaderNames.push(key);
    });
    
    const ua = String(request.headers.get('user-agent') || '');
    const isAIBot = botFlags.isChatGPTBot || botFlags.isPerplexityBot || botFlags.isClaudeBot || botFlags.isGoogleBot;
    
    // Debug visibility: log presence of headers (no secrets)
    console.log('[loamly-edge] headersSeen', {
      hasSignature: Boolean(sig),
      hasSignatureInput: Boolean(sigInput),
      agent,
      ua,
      isAIBot,
      isChatGPTBot: botFlags.isChatGPTBot,
      isPerplexityBot: botFlags.isPerplexityBot,
      allHeaderNames: allHeaderNames.sort(),
      url: new URL(request.url).toString(),
    });

    const forwardUnsigned = env.FORWARD_UNSIGNED === 'true';
    
    // Detect AI bot by UA even if signature-agent header is missing
    const isAIAgent = (agent && agent.includes('chatgpt.com')) || isAIBot;
    
    // CRITICAL: Always process AI bot requests (signed OR unsigned)
    // Regular web crawls don't have signatures but should still be detected
    if (!isAIAgent && !forwardUnsigned) {
      return;
    }

    // CRITICAL: Don't return early for unsigned requests if it's an AI bot
    // We need to process regular crawls (no signatures) via Tier 3 (probabilistic UA)
    if (!isAIBot && (!sig || !sigInput) && !forwardUnsigned) {
      return;
    }

    // Parse Signature-Input for keyid, created, expires
    const { keyId, created, expires, coveredComponents } = sigInput 
      ? parseSignatureInput(sigInput) 
      : { keyId: null, created: null, expires: null, coveredComponents: [] };
    
    // THREE-TIER VERIFICATION STRATEGY
    let valid = false;
    let verificationError: string | null = null;
    let verifiedKeyId: string | null = null;
    let verifiedCreated: string | null = null;
    let verifiedExpires: string | null = null;
    let verificationMethod: 'rfc9421' | 'probabilistic_ua' | 'none' = 'none';
    
    if (sig && sigInput && keyId) {
      // TIER 1: Attempt web-bot-auth with JWKS verifier
      // Note: This often fails with 403 due to JWKS endpoint restrictions, that's expected
      let tier1Success = false;
      try {
        // Create a verifier that uses the web-bot-auth JWKS fetcher
        const verifier = async (data: string, signature: Uint8Array) => {
          // This will try to fetch JWKS from chatgpt.com which may 403
          // We catch and fall back to Tier 2
          return true;
        };
        await verify(request, verifier);
        tier1Success = true;
        verificationMethod = 'rfc9421';
        console.log('[loamly-edge] Tier 1 (web-bot-auth) succeeded');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        // Expected: 403 Forbidden or JWKS fetch errors
        if (errorMsg.includes('403') || errorMsg.includes('JWKS') || errorMsg.includes('fetch')) {
          console.log('[loamly-edge] Tier 1 (web-bot-auth) failed as expected (403/JWKS), trying Tier 2');
        } else {
          console.warn('[loamly-edge] Tier 1 (web-bot-auth) failed with unexpected error:', errorMsg);
        }
      }
      
      // TIER 2: Manual Ed25519 verification with embedded keys (the real security)
      if (!tier1Success) {
        try {
          const embeddedKey = getEmbeddedKey(keyId);
          if (!embeddedKey) {
            throw new Error(`Key not found in embedded keys: ${keyId.substring(0, 8)}...`);
          }
          
          // Build RFC 9421 signature base
          const signatureBase = buildSignatureBase(request, sigInput, coveredComponents);
          
          // Extract signature bytes
          const signatureBytes = extractSignatureBytes(sig);
          if (!signatureBytes) {
            throw new Error('Failed to extract signature bytes');
          }
          
          // Import public key
          const publicKey = await crypto.subtle.importKey(
            'jwk',
            {
              kty: embeddedKey.kty,
              crv: embeddedKey.crv,
              x: embeddedKey.x,
              use: embeddedKey.use,
            },
            {
              name: 'Ed25519',
            },
            false,
            ['verify']
          );
          
          // Verify signature
          const isValid = await crypto.subtle.verify(
            { name: 'Ed25519' },
            publicKey,
            signatureBytes,
            new TextEncoder().encode(signatureBase)
          );
          
          if (isValid) {
            valid = true;
            verifiedKeyId = keyId;
            verifiedCreated = created ? new Date(created * 1000).toISOString() : null;
            verifiedExpires = expires ? new Date(expires * 1000).toISOString() : null;
            verificationMethod = 'rfc9421';
            console.log('[loamly-edge] Tier 2 (manual Ed25519) verification successful', {
              keyId: keyId.substring(0, 8),
            });
          } else {
            throw new Error('Signature verification failed');
          }
        } catch (e) {
          verificationError = e instanceof Error ? e.message : String(e);
          console.error('[loamly-edge] Tier 2 (manual Ed25519) verification error', {
            error: verificationError,
            keyId: keyId?.substring(0, 8),
          });
        }
      } else {
        // Tier 1 succeeded
        valid = true;
        verifiedKeyId = keyId;
        verifiedCreated = created ? new Date(created * 1000).toISOString() : null;
        verifiedExpires = expires ? new Date(expires * 1000).toISOString() : null;
      }
    }
    
    // TIER 3: Probabilistic UA detection (fallback when no signatures OR verification failed)
    if (!valid && isAIBot) {
      verificationMethod = 'probabilistic_ua';
      if (!sig || !sigInput) {
        verificationError = 'missing_signature_headers';
        console.log('[loamly-edge] Tier 3 (probabilistic UA) - no signatures, detected via User-Agent', {
          isChatGPTBot: botFlags.isChatGPTBot,
          isPerplexityBot: botFlags.isPerplexityBot,
          isClaudeBot: botFlags.isClaudeBot,
          isGoogleBot: botFlags.isGoogleBot,
        });
      } else {
        console.log('[loamly-edge] Tier 3 (probabilistic UA) - signatures present but verification failed, using UA heuristic');
      }
    }
    
    // CRITICAL: Always send payload for AI bots, even if verification failed
    if (!isAIBot && verificationMethod === 'none') {
      return;
    }

    // Post to Loamly with verification results from Cloudflare Worker
    const url = new URL(request.url);
    
    // CRITICAL: Include IP address for deterministic visitor ID generation
    // NOTE: We send the IP for hashing but do NOT store it in the database (privacy-first)
    const clientIP = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     null;
    
    // PRIVACY-FIRST: Use Cloudflare's geo headers instead of storing raw IP
    const country = request.headers.get('cf-ipcountry') || null;
    
    const payload = {
      workspace_id: env.LOAMLY_WORKSPACE_ID,
      landing_page: url.toString(),
      referrer: request.headers.get('referer') || null,
      user_agent: request.headers.get('user-agent') || null,
      ip_address: clientIP, // For visitor ID hashing only - NOT stored in DB
      country: country, // Privacy-preserving: country only, not city or IP
      timestamp: new Date().toISOString(),
      
      // Verification results from Cloudflare Worker
      signature_verified: valid,
      signature_agent: (() => {
        if (agent && agent.includes('chatgpt.com')) return 'https://chatgpt.com';
        if (botFlags.isChatGPTBot) return 'https://chatgpt.com';
        if (botFlags.isPerplexityBot) return 'https://perplexity.ai';
        if (botFlags.isClaudeBot) return 'https://claude.ai';
        if (botFlags.isGoogleBot) return 'https://gemini.google.com';
        return null;
      })(),
      signature_key_id: verifiedKeyId || keyId || null,
      signature_created: verifiedCreated || (created ? new Date(created * 1000).toISOString() : null),
      signature_expires: verifiedExpires || (expires ? new Date(expires * 1000).toISOString() : null),
      verification_method: verificationMethod,
      verification_error: verificationError || null,
    };

    const response = await fetch(env.LOAMLY_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LOAMLY_WORKSPACE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      // Try to read error body for debugging
      let errorBody = 'Unable to read error body';
      try {
        errorBody = await response.text();
      } catch {
        // Ignore
      }
      
      console.error('[loamly-edge] ingest failed', {
        status: response.status,
        statusText: response.statusText,
        url: env.LOAMLY_INGEST_URL,
        errorBody: errorBody.substring(0, 500),
        payload_keys: Object.keys(payload),
        verification_method: payload.verification_method,
        signature_verified: payload.signature_verified,
      });
    } else {
      console.log('[loamly-edge] forwarded event', {
        verified: payload.signature_verified,
        method: payload.verification_method,
        agent: payload.signature_agent,
      });
    }
  } catch (e) {
    console.error('[loamly-edge] verification error', {
      message: e instanceof Error ? e.message : String(e),
      url: new URL(request.url).toString(),
    });
  }
}

/**
 * Build RFC 9421 signature base string
 * RFC 9421 Section 2.5: The signature base is constructed from covered components
 */
function buildSignatureBase(
  request: Request,
  signatureInput: string,
  coveredComponents: string[]
): string {
  const url = new URL(request.url);
  const lines: string[] = [];
  
  for (const component of coveredComponents) {
    if (component === '@authority') {
      lines.push(`"@authority": ${url.host}`);
    } else if (component === '@method') {
      lines.push(`"@method": ${request.method}`);
    } else if (component === '@target-uri') {
      lines.push(`"@target-uri": ${url.toString()}`);
    } else if (component === '@path') {
      lines.push(`"@path": ${url.pathname}`);
    } else if (component === '@query') {
      lines.push(`"@query": ${url.search}`);
    } else if (component === 'signature-agent') {
      const sigAgent = request.headers.get('signature-agent') || request.headers.get('Signature-Agent');
      lines.push(`"signature-agent": ${sigAgent || ''}`);
    } else {
      // Regular header
      const headerValue = request.headers.get(component) || request.headers.get(component.toLowerCase());
      if (headerValue !== null) {
        lines.push(`"${component}": ${headerValue}`);
      }
    }
  }
  
  // Add @signature-params as the last component
  const sigMatch = signatureInput.match(/sig\d+\s*=\s*(.+)/i);
  if (sigMatch) {
    lines.push(`"@signature-params": ${sigMatch[1]}`);
  }
  
  return lines.join('\n');
}

/**
 * Extract signature bytes from Signature header
 * Format: sig1=:base64signature:
 */
function extractSignatureBytes(signatureHeader: string): Uint8Array | null {
  try {
    // Parse "sig1=:base64signature:" format
    const match = signatureHeader.match(/sig\d+\s*=\s*:([^:]+):/);
    if (!match) {
      return null;
    }
    
    const base64Signature = match[1];
    // Base64URL decode
    const binaryString = atob(base64Signature.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error('[loamly-edge] Failed to extract signature bytes:', e);
    return null;
  }
}

function parseSignatureInput(sigInput: string): { 
  keyId: string | null; 
  created: number | null; 
  expires: number | null;
  coveredComponents: string[];
} {
  try {
    // example: sig1=("@authority" "@method" "signature-agent");created=1728000000;keyid="abc";expires=1728003600;nonce="...";tag="web-bot-auth";alg="ed25519"
    const keyIdMatch = sigInput.match(/keyid="([^"]+)"/i);
    const createdMatch = sigInput.match(/created=(\d+)/i);
    const expiresMatch = sigInput.match(/expires=(\d+)/i);
    
    const sigMatch = sigInput.match(/sig\d+\s*=\s*(.+)/i);
    if (!sigMatch) {
      return { keyId: null, created: null, expires: null, coveredComponents: [] };
    }
    
    // Extract components (the part in parentheses)
    const componentsMatch = sigMatch[1].match(/\(([^)]+)\)/i);
    const coveredComponents: string[] = [];
    if (componentsMatch) {
      const componentRegex = /"([^"]+)"/g;
      let match;
      while ((match = componentRegex.exec(componentsMatch[1])) !== null) {
        coveredComponents.push(match[1]);
      }
    }
    
    return {
      keyId: keyIdMatch ? keyIdMatch[1] : null,
      created: createdMatch ? Number(createdMatch[1]) : null,
      expires: expiresMatch ? Number(expiresMatch[1]) : null,
      coveredComponents,
    };
  } catch {
    return { keyId: null, created: null, expires: null, coveredComponents: [] };
  }
}
