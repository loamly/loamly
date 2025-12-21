/**
 * Loamly RFC 9421 Verifier
 * 
 * Cloudflare Worker for verifying AI agent HTTP signatures.
 * Implements the RFC 9421 HTTP Message Signatures standard.
 * 
 * Supported AI Agents:
 * - ChatGPT / OpenAI Operator (RFC 9421 Ed25519 signatures)
 * - Perplexity / PerplexityBot (User-Agent detection)
 * - Claude / Anthropic (User-Agent detection)
 * - Google Gemini / Google-Extended (User-Agent detection)
 * 
 * Detection tiers:
 * 1. RFC 9421 cryptographic verification (gold standard, 100% accuracy)
 * 2. Embedded Ed25519 key verification (fallback for WAF blocks)
 * 3. Probabilistic User-Agent matching (fallback)
 * 
 * @module @loamly/rfc9421-verifier
 * @version 1.0.0
 * @license MIT
 * @see https://github.com/loamly/loamly
 * @see https://datatracker.ietf.org/doc/html/rfc9421
 */

import { verify } from 'web-bot-auth';

export interface Env {
  LOAMLY_WORKSPACE_ID: string;
  LOAMLY_WORKSPACE_API_KEY: string;
  LOAMLY_INGEST_URL: string;
  FORWARD_UNSIGNED?: string;
}

// Embedded JWKS keys for ChatGPT (public data)
type EmbeddedKey = {
  kid: string;
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  use: 'sig';
  nbf?: number;
  exp?: number;
};

const EMBEDDED_KEYS: EmbeddedKey[] = [
  {
    kid: 'otMqcjr17mGyruktGvJU8oojQTSMHlVm7uO-lrcqbdg',
    kty: 'OKP',
    crv: 'Ed25519',
    x: '7F_3jDlxaquwh291MiACkcS3Opq88NksyHiakzS-Y1g',
    use: 'sig',
    nbf: 1735689600,
    exp: 1766263057,
  },
];

function getEmbeddedKey(keyId: string): EmbeddedKey | null {
  const embedded = EMBEDDED_KEYS.find(k => k.kid === keyId);
  if (!embedded) return null;
  if (embedded.exp && Date.now() / 1000 > embedded.exp) return null;
  if (embedded.nbf && Date.now() / 1000 < embedded.nbf) return null;
  return embedded;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const sig = request.headers.get('signature') || request.headers.get('Signature');
    const sigInput = request.headers.get('signature-input') || request.headers.get('Signature-Input');
    const agentHeader = request.headers.get('signature-agent') || request.headers.get('Signature-Agent');
    const agent = agentHeader ? String(agentHeader).replace(/^"|"$/g, '') : '';
    const ua = String(request.headers.get('user-agent') || '').toLowerCase();
    
    const isChatGPTBot = ua.includes('chatgpt-user') || ua.includes('chatgpt.com') || ua.includes('gptbot');
    const isPerplexityBot = ua.includes('perplexitybot');
    const isClaudeBot = ua.includes('claudebot') || ua.includes('anthropic-ai');
    const isGoogleBot = ua.includes('google-extended');
    const isAIBot = isChatGPTBot || isPerplexityBot || isClaudeBot || isGoogleBot;
    const isAgentFetch = (sig && sigInput) || (agent && agent.includes('chatgpt.com')) || isAIBot;
    
    const response = await fetch(request);
    
    if (isAgentFetch && request.method === 'GET') {
      let assistantName = 'unknown';
      if (agent.includes('chatgpt.com') || isChatGPTBot) assistantName = 'chatgpt';
      else if (isPerplexityBot) assistantName = 'perplexity';
      else if (isClaudeBot) assistantName = 'claude';
      else if (isGoogleBot) assistantName = 'gemini';
      
      if (assistantName !== 'unknown') {
        const cookieValue = `${assistantName}:${Date.now()}:${crypto.randomUUID().substring(0, 8)}`;
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
    const agent = agentHeader ? String(agentHeader).replace(/^"|"$/g, '') : '';
    
    const isAIBot = botFlags.isChatGPTBot || botFlags.isPerplexityBot || botFlags.isClaudeBot || botFlags.isGoogleBot;
    const isAIAgent = (agent && agent.includes('chatgpt.com')) || isAIBot;
    const forwardUnsigned = env.FORWARD_UNSIGNED === 'true';
    
    if (!isAIAgent && !forwardUnsigned) return;
    if (!isAIBot && (!sig || !sigInput) && !forwardUnsigned) return;
    
    const { keyId, created, expires, coveredComponents } = sigInput 
      ? parseSignatureInput(sigInput) 
      : { keyId: null, created: null, expires: null, coveredComponents: [] };
    
    let valid = false;
    let verificationError: string | null = null;
    let verifiedKeyId: string | null = null;
    let verifiedCreated: string | null = null;
    let verifiedExpires: string | null = null;
    let verificationMethod: 'rfc9421' | 'probabilistic_ua' | 'none' = 'none';
    
    if (sig && sigInput && keyId) {
      // Tier 1: web-bot-auth
      try {
        await verify(request);
        valid = true;
        verificationMethod = 'rfc9421';
      } catch {
        // Tier 2: Manual Ed25519
        try {
          const embeddedKey = getEmbeddedKey(keyId);
          if (!embeddedKey) throw new Error('Key not found');
          
          const signatureBase = buildSignatureBase(request, sigInput, coveredComponents);
          const signatureBytes = extractSignatureBytes(sig);
          if (!signatureBytes) throw new Error('Failed to extract signature');
          
          const publicKey = await crypto.subtle.importKey(
            'jwk',
            { kty: embeddedKey.kty, crv: embeddedKey.crv, x: embeddedKey.x, use: embeddedKey.use },
            { name: 'Ed25519' },
            false,
            ['verify']
          );
          
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
          }
        } catch (e) {
          verificationError = e instanceof Error ? e.message : String(e);
        }
      }
      
      if (valid) {
        verifiedKeyId = keyId;
        verifiedCreated = created ? new Date(created * 1000).toISOString() : null;
        verifiedExpires = expires ? new Date(expires * 1000).toISOString() : null;
      }
    }
    
    // Tier 3: Probabilistic UA
    if (!valid && isAIBot) {
      verificationMethod = 'probabilistic_ua';
      if (!sig || !sigInput) verificationError = 'missing_signature_headers';
    }
    
    if (!isAIBot && verificationMethod === 'none') return;
    
    const url = new URL(request.url);
    const payload = {
      workspace_id: env.LOAMLY_WORKSPACE_ID,
      landing_page: url.toString(),
      referrer: request.headers.get('referer') || null,
      user_agent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
      signature_verified: valid,
      signature_agent: (() => {
        if (agent.includes('chatgpt.com') || botFlags.isChatGPTBot) return 'https://chatgpt.com';
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

    await fetch(env.LOAMLY_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LOAMLY_WORKSPACE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[rfc9421-verifier]', e instanceof Error ? e.message : String(e));
  }
}

function buildSignatureBase(request: Request, signatureInput: string, coveredComponents: string[]): string {
  const url = new URL(request.url);
  const lines: string[] = [];
  
  for (const component of coveredComponents) {
    if (component === '@authority') lines.push(`"@authority": ${url.host}`);
    else if (component === '@method') lines.push(`"@method": ${request.method}`);
    else if (component === '@target-uri') lines.push(`"@target-uri": ${url.toString()}`);
    else if (component === '@path') lines.push(`"@path": ${url.pathname}`);
    else if (component === '@query') lines.push(`"@query": ${url.search}`);
    else if (component === 'signature-agent') {
      const sigAgent = request.headers.get('signature-agent') || request.headers.get('Signature-Agent');
      lines.push(`"signature-agent": ${sigAgent || ''}`);
    } else {
      const headerValue = request.headers.get(component);
      if (headerValue !== null) lines.push(`"${component}": ${headerValue}`);
    }
  }
  
  const sigMatch = signatureInput.match(/sig\d+\s*=\s*(.+)/i);
  if (sigMatch) lines.push(`"@signature-params": ${sigMatch[1]}`);
  
  return lines.join('\n');
}

function extractSignatureBytes(signatureHeader: string): Uint8Array | null {
  try {
    const match = signatureHeader.match(/sig\d+\s*=\s*:([^:]+):/);
    if (!match) return null;
    
    const base64Signature = match[1];
    const binaryString = atob(base64Signature.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
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
    const keyIdMatch = sigInput.match(/keyid="([^"]+)"/i);
    const createdMatch = sigInput.match(/created=(\d+)/i);
    const expiresMatch = sigInput.match(/expires=(\d+)/i);
    
    const sigMatch = sigInput.match(/sig\d+\s*=\s*(.+)/i);
    if (!sigMatch) return { keyId: null, created: null, expires: null, coveredComponents: [] };
    
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


