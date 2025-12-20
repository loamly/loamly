/**
 * Loamly Tracker Configuration
 * @module @loamly/tracker
 */

export const VERSION = '1.6.0'

export const DEFAULT_CONFIG = {
  apiHost: 'https://app.loamly.ai',
  endpoints: {
    visit: '/api/ingest/visit',
    behavioral: '/api/ingest/behavioral',
    session: '/api/ingest/session',
    resolve: '/api/tracker/resolve',
    health: '/api/tracker/health',
    ping: '/api/tracker/ping',
  },
  pingInterval: 30000, // 30 seconds
  batchSize: 10,
  batchTimeout: 5000,
  sessionTimeout: 1800000, // 30 minutes
  maxTextLength: 100,
  timeSpentThresholdMs: 5000, // Only send time_spent when delta >= 5 seconds
} as const

/**
 * Known AI platforms for referrer detection
 */
export const AI_PLATFORMS: Record<string, string> = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'claude.ai': 'claude',
  'perplexity.ai': 'perplexity',
  'bard.google.com': 'bard',
  'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
  'github.com/copilot': 'github-copilot',
  'you.com': 'you',
  'phind.com': 'phind',
  'poe.com': 'poe',
}

/**
 * User agents of known AI crawlers
 */
export const AI_BOT_PATTERNS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'PerplexityBot',
  'Amazonbot',
  'Google-Extended',
  'CCBot',
  'anthropic-ai',
  'cohere-ai',
]

