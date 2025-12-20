/**
 * Loamly Tracker Types
 * @module @loamly/tracker
 */

export interface LoamlyConfig {
  /** Your Loamly API key (found in dashboard) */
  apiKey?: string
  
  /** Custom API host (default: https://app.loamly.ai) */
  apiHost?: string
  
  /** Enable debug mode for console logging */
  debug?: boolean
  
  /** Disable automatic page view tracking */
  disableAutoPageview?: boolean
  
  /** Disable behavioral tracking (scroll, time, forms) */
  disableBehavioral?: boolean
  
  /** Custom session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number
}

export interface TrackEventOptions {
  /** Custom properties to attach to the event */
  properties?: Record<string, unknown>
  
  /** Revenue amount for conversion events */
  revenue?: number
  
  /** Currency code (default: USD) */
  currency?: string
}

export interface NavigationTiming {
  /** Navigation type: 'likely_paste' or 'likely_click' */
  nav_type: 'likely_paste' | 'likely_click' | 'unknown'
  
  /** Confidence score (0-1) */
  confidence: number
  
  /** Detection signals used */
  signals: string[]
}

export interface AIDetectionResult {
  /** Whether AI was detected as the source */
  isAI: boolean
  
  /** AI platform name if detected */
  platform?: string
  
  /** Confidence score (0-1) */
  confidence: number
  
  /** Detection method used */
  method: 'referrer' | 'timing' | 'behavioral' | 'temporal' | 'unknown'
}

/**
 * Behavioral ML classification result
 */
export interface BehavioralMLResult {
  /** Classification result */
  classification: 'human' | 'ai_influenced' | 'uncertain'
  /** Probability of human behavior (0-1) */
  humanProbability: number
  /** Probability of AI-influenced behavior (0-1) */
  aiProbability: number
  /** Confidence in classification */
  confidence: number
  /** Behavioral signals detected */
  signals: string[]
  /** Session duration when classified */
  sessionDurationMs: number
}

export interface LoamlyTracker {
  /** Initialize the tracker with configuration */
  init: (config: LoamlyConfig) => void
  
  /** Track a page view (called automatically unless disabled) */
  pageview: (url?: string) => void
  
  /** Track a custom event */
  track: (eventName: string, options?: TrackEventOptions) => void
  
  /** Track a conversion/revenue event */
  conversion: (eventName: string, revenue: number, currency?: string) => void
  
  /** Identify a user (for linking sessions) */
  identify: (userId: string, traits?: Record<string, unknown>) => void
  
  /** Get the current session ID */
  getSessionId: () => string | null
  
  /** Get the current visitor ID */
  getVisitorId: () => string | null
  
  /** Get AI detection result for current page */
  getAIDetection: () => AIDetectionResult | null
  
  /** Get navigation timing analysis */
  getNavigationTiming: () => NavigationTiming | null
  
  /** Get behavioral ML classification result */
  getBehavioralML: () => BehavioralMLResult | null
  
  /** Check if tracker is initialized */
  isInitialized: () => boolean
  
  /** Reset the tracker (clears session) */
  reset: () => void
  
  /** Enable debug mode */
  debug: (enabled: boolean) => void
}


