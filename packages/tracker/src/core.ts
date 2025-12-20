/**
 * Loamly Tracker Core
 * 
 * Cookie-free, privacy-first analytics with AI traffic detection.
 * 
 * @module @loamly/tracker
 */

import { VERSION, DEFAULT_CONFIG } from './config'
import { detectNavigationType } from './detection/navigation-timing'
import { detectAIFromReferrer, detectAIFromUTM } from './detection/referrer'
import { 
  getVisitorId, 
  getSessionId, 
  extractUTMParams, 
  truncateText,
  safeFetch,
  sendBeacon 
} from './utils'
import type { 
  LoamlyConfig, 
  LoamlyTracker, 
  TrackEventOptions, 
  NavigationTiming,
  AIDetectionResult 
} from './types'

// State
let config: LoamlyConfig & { apiHost: string } = { apiHost: DEFAULT_CONFIG.apiHost }
let initialized = false
let debugMode = false
let visitorId: string | null = null
let sessionId: string | null = null
let sessionStartTime: number | null = null
let navigationTiming: NavigationTiming | null = null
let aiDetection: AIDetectionResult | null = null

/**
 * Debug logger
 */
function log(...args: unknown[]): void {
  if (debugMode) {
    console.log('[Loamly]', ...args)
  }
}

/**
 * Build API endpoint URL
 */
function endpoint(path: string): string {
  return `${config.apiHost}${path}`
}

/**
 * Initialize the tracker
 */
function init(userConfig: LoamlyConfig = {}): void {
  if (initialized) {
    log('Already initialized')
    return
  }

  config = {
    ...config,
    ...userConfig,
    apiHost: userConfig.apiHost || DEFAULT_CONFIG.apiHost,
  }
  
  debugMode = userConfig.debug ?? false
  
  log('Initializing Loamly Tracker v' + VERSION)
  
  // Get/create visitor ID
  visitorId = getVisitorId()
  log('Visitor ID:', visitorId)
  
  // Get/create session
  const session = getSessionId()
  sessionId = session.sessionId
  sessionStartTime = Date.now()
  log('Session ID:', sessionId, session.isNew ? '(new)' : '(existing)')
  
  // Detect navigation timing (paste vs click)
  navigationTiming = detectNavigationType()
  log('Navigation timing:', navigationTiming)
  
  // Detect AI from referrer
  aiDetection = detectAIFromReferrer(document.referrer) || detectAIFromUTM(window.location.href)
  if (aiDetection) {
    log('AI detected:', aiDetection)
  }
  
  initialized = true
  
  // Auto pageview unless disabled
  if (!userConfig.disableAutoPageview) {
    pageview()
  }
  
  // Set up behavioral tracking unless disabled
  if (!userConfig.disableBehavioral) {
    setupBehavioralTracking()
  }
  
  log('Initialization complete')
}

/**
 * Track a page view
 */
function pageview(customUrl?: string): void {
  if (!initialized) {
    log('Not initialized, call init() first')
    return
  }

  const url = customUrl || window.location.href
  const payload = {
    visitor_id: visitorId,
    session_id: sessionId,
    url,
    referrer: document.referrer || null,
    title: document.title || null,
    utm_source: extractUTMParams(url).utm_source || null,
    utm_medium: extractUTMParams(url).utm_medium || null,
    utm_campaign: extractUTMParams(url).utm_campaign || null,
    user_agent: navigator.userAgent,
    screen_width: window.screen?.width,
    screen_height: window.screen?.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tracker_version: VERSION,
    navigation_timing: navigationTiming,
    ai_platform: aiDetection?.platform || null,
    is_ai_referrer: aiDetection?.isAI || false,
  }

  log('Pageview:', payload)

  safeFetch(endpoint(DEFAULT_CONFIG.endpoints.visit), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Track a custom event
 */
function track(eventName: string, options: TrackEventOptions = {}): void {
  if (!initialized) {
    log('Not initialized, call init() first')
    return
  }

  const payload = {
    visitor_id: visitorId,
    session_id: sessionId,
    event_name: eventName,
    event_type: 'custom',
    properties: options.properties || {},
    revenue: options.revenue,
    currency: options.currency || 'USD',
    url: window.location.href,
    timestamp: new Date().toISOString(),
    tracker_version: VERSION,
  }

  log('Event:', eventName, payload)

  safeFetch(endpoint('/api/ingest/event'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Track a conversion/revenue event
 */
function conversion(eventName: string, revenue: number, currency = 'USD'): void {
  track(eventName, { revenue, currency, properties: { type: 'conversion' } })
}

/**
 * Identify a user
 */
function identify(userId: string, traits: Record<string, unknown> = {}): void {
  if (!initialized) {
    log('Not initialized, call init() first')
    return
  }

  log('Identify:', userId, traits)

  const payload = {
    visitor_id: visitorId,
    session_id: sessionId,
    user_id: userId,
    traits,
    timestamp: new Date().toISOString(),
  }

  safeFetch(endpoint('/api/ingest/identify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Set up behavioral tracking (scroll, time spent, etc.)
 */
function setupBehavioralTracking(): void {
  let maxScrollDepth = 0
  let lastScrollUpdate = 0
  let lastTimeUpdate = Date.now()

  // Scroll tracking with requestAnimationFrame throttling
  let scrollTicking = false
  
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const scrollPercent = Math.round(
          ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
        )
        
        if (scrollPercent > maxScrollDepth) {
          maxScrollDepth = scrollPercent
          
          // Report at milestones (25%, 50%, 75%, 100%)
          const milestones = [25, 50, 75, 100]
          for (const milestone of milestones) {
            if (scrollPercent >= milestone && lastScrollUpdate < milestone) {
              lastScrollUpdate = milestone
              sendBehavioralEvent('scroll_depth', { depth: milestone })
            }
          }
        }
        
        scrollTicking = false
      })
      scrollTicking = true
    }
  })

  // Time spent tracking (every 5 seconds minimum)
  const trackTimeSpent = (): void => {
    const now = Date.now()
    const delta = now - lastTimeUpdate
    
    if (delta >= DEFAULT_CONFIG.timeSpentThresholdMs) {
      lastTimeUpdate = now
      sendBehavioralEvent('time_spent', { 
        seconds: Math.round(delta / 1000),
        total_seconds: Math.round((now - (sessionStartTime || now)) / 1000)
      })
    }
  }

  // Track on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackTimeSpent()
    }
  })

  // Track on page unload
  window.addEventListener('beforeunload', () => {
    trackTimeSpent()
    
    // Send final scroll depth
    if (maxScrollDepth > 0) {
      sendBeacon(endpoint(DEFAULT_CONFIG.endpoints.behavioral), {
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: 'scroll_depth_final',
        data: { depth: maxScrollDepth },
        url: window.location.href,
      })
    }
  })

  // Form interaction tracking
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      sendBehavioralEvent('form_focus', {
        field_type: target.tagName.toLowerCase(),
        field_name: (target as HTMLInputElement).name || (target as HTMLInputElement).id || 'unknown',
      })
    }
  })

  // Form submit tracking
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement
    sendBehavioralEvent('form_submit', {
      form_id: form.id || form.name || 'unknown',
      form_action: form.action ? new URL(form.action).pathname : 'unknown',
    })
  })

  // Click tracking for links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')
    
    if (link && link.href) {
      const isExternal = link.hostname !== window.location.hostname
      sendBehavioralEvent('click', {
        element: 'link',
        href: truncateText(link.href, 200),
        text: truncateText(link.textContent || '', 100),
        is_external: isExternal,
      })
    }
  })
}

/**
 * Send a behavioral event
 */
function sendBehavioralEvent(eventType: string, data: Record<string, unknown>): void {
  const payload = {
    visitor_id: visitorId,
    session_id: sessionId,
    event_type: eventType,
    data,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    tracker_version: VERSION,
  }

  log('Behavioral:', eventType, data)

  safeFetch(endpoint(DEFAULT_CONFIG.endpoints.behavioral), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Get current session ID
 */
function getCurrentSessionId(): string | null {
  return sessionId
}

/**
 * Get current visitor ID
 */
function getCurrentVisitorId(): string | null {
  return visitorId
}

/**
 * Get AI detection result
 */
function getAIDetectionResult(): AIDetectionResult | null {
  return aiDetection
}

/**
 * Get navigation timing result
 */
function getNavigationTimingResult(): NavigationTiming | null {
  return navigationTiming
}

/**
 * Check if initialized
 */
function isTrackerInitialized(): boolean {
  return initialized
}

/**
 * Reset the tracker
 */
function reset(): void {
  log('Resetting tracker')
  initialized = false
  visitorId = null
  sessionId = null
  sessionStartTime = null
  navigationTiming = null
  aiDetection = null
  
  try {
    sessionStorage.removeItem('loamly_session')
    sessionStorage.removeItem('loamly_start')
  } catch {
    // Ignore
  }
}

/**
 * Enable/disable debug mode
 */
function setDebug(enabled: boolean): void {
  debugMode = enabled
  log('Debug mode:', enabled ? 'enabled' : 'disabled')
}

/**
 * The Loamly Tracker instance
 */
export const loamly: LoamlyTracker = {
  init,
  pageview,
  track,
  conversion,
  identify,
  getSessionId: getCurrentSessionId,
  getVisitorId: getCurrentVisitorId,
  getAIDetection: getAIDetectionResult,
  getNavigationTiming: getNavigationTimingResult,
  isInitialized: isTrackerInitialized,
  reset,
  debug: setDebug,
}

export default loamly

