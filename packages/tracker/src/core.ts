/**
 * Loamly Tracker Core
 * 
 * Cookie-free, privacy-first analytics with comprehensive AI traffic detection.
 * 
 * Features:
 * - Navigation Timing API (paste vs click detection)
 * - Behavioral ML Classifier (mouse, scroll, interaction patterns)
 * - Focus/Blur Sequence Analysis (copy-paste detection)
 * - Agentic Browser Detection (Comet, CDP, teleporting clicks)
 * - Advanced Scroll Tracking (30% chunk reporting)
 * - Universal Form Tracking (HubSpot, Typeform, native)
 * - SPA Navigation Support (History API hooks)
 * - Event Queue with Retry (offline support)
 * - Real-time Ping (heartbeat)
 * 
 * @module @loamly/tracker
 */

import { VERSION, DEFAULT_CONFIG } from './config'
import { detectNavigationType } from './detection/navigation-timing'
import { detectAIFromReferrer, detectAIFromUTM } from './detection/referrer'
import { 
  BehavioralClassifier, 
  type BehavioralClassificationResult 
} from './detection/behavioral-classifier'
import {
  FocusBlurAnalyzer,
  type FocusBlurResult
} from './detection/focus-blur'
import {
  AgenticBrowserAnalyzer,
  type AgenticDetectionResult
} from './detection/agentic-browser'
import { EventQueue } from './infrastructure/event-queue'
import { PingService } from './infrastructure/ping'
import { ScrollTracker, type ScrollEvent } from './behavioral/scroll-tracker'
import { TimeTracker, type TimeEvent } from './behavioral/time-tracker'
import { FormTracker, type FormEvent } from './behavioral/form-tracker'
import { SPARouter, type NavigationEvent } from './spa/router'
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
  AIDetectionResult,
  BehavioralMLResult,
  FocusBlurMLResult
} from './types'

// State
let config: LoamlyConfig & { apiHost: string } = { apiHost: DEFAULT_CONFIG.apiHost }
let initialized = false
let debugMode = false
let visitorId: string | null = null
let sessionId: string | null = null
let navigationTiming: NavigationTiming | null = null
let aiDetection: AIDetectionResult | null = null

// Detection modules
let behavioralClassifier: BehavioralClassifier | null = null
let behavioralMLResult: BehavioralMLResult | null = null
let focusBlurAnalyzer: FocusBlurAnalyzer | null = null
let focusBlurResult: FocusBlurMLResult | null = null
let agenticAnalyzer: AgenticBrowserAnalyzer | null = null

// Infrastructure modules
let eventQueue: EventQueue | null = null
let pingService: PingService | null = null

// Behavioral tracking modules
let scrollTracker: ScrollTracker | null = null
let timeTracker: TimeTracker | null = null
let formTracker: FormTracker | null = null

// SPA navigation
let spaRouter: SPARouter | null = null

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
  log('Session ID:', sessionId, session.isNew ? '(new)' : '(existing)')
  
  // Initialize event queue with batching
  eventQueue = new EventQueue(endpoint(DEFAULT_CONFIG.endpoints.behavioral), {
    batchSize: DEFAULT_CONFIG.batchSize,
    batchTimeout: DEFAULT_CONFIG.batchTimeout,
  })
  
  // Detect navigation timing (paste vs click)
  navigationTiming = detectNavigationType()
  log('Navigation timing:', navigationTiming)
  
  // Detect AI from referrer/UTM
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
    setupAdvancedBehavioralTracking()
  }
  
  // Initialize behavioral ML classifier (LOA-180)
  behavioralClassifier = new BehavioralClassifier(10000) // 10s min session
  behavioralClassifier.setOnClassify(handleBehavioralClassification)
  setupBehavioralMLTracking()
  
  // Initialize focus/blur analyzer (LOA-182)
  focusBlurAnalyzer = new FocusBlurAnalyzer()
  focusBlurAnalyzer.initTracking()
  
  // Analyze focus/blur after 5 seconds
  setTimeout(() => {
    if (focusBlurAnalyzer) {
      handleFocusBlurAnalysis(focusBlurAnalyzer.analyze())
    }
  }, 5000)
  
  // Initialize agentic browser detection (LOA-187)
  agenticAnalyzer = new AgenticBrowserAnalyzer()
  agenticAnalyzer.init()
  
  // Set up ping service
  if (visitorId && sessionId) {
    pingService = new PingService(sessionId, visitorId, VERSION, {
      interval: DEFAULT_CONFIG.pingInterval,
      endpoint: endpoint(DEFAULT_CONFIG.endpoints.ping),
    })
    pingService.start()
  }
  
  // Set up SPA navigation tracking
  spaRouter = new SPARouter({
    onNavigate: handleSPANavigation,
  })
  spaRouter.start()
  
  // Set up unload handlers
  setupUnloadHandlers()
  
  // Report health status
  reportHealth('initialized')
  
  log('Initialization complete')
}

/**
 * Set up advanced behavioral tracking with new modules
 */
function setupAdvancedBehavioralTracking(): void {
  // Scroll tracker with 30% chunks
  scrollTracker = new ScrollTracker({
    chunks: [30, 60, 90, 100],
    onChunkReached: (event: ScrollEvent) => {
      log('Scroll chunk:', event.chunk)
      queueEvent('scroll_depth', {
        depth: event.depth,
        chunk: event.chunk,
        time_to_reach_ms: event.time_to_reach_ms,
      })
    },
  })
  scrollTracker.start()
  
  // Time tracker
  timeTracker = new TimeTracker({
    updateIntervalMs: 10000, // Report every 10 seconds
    onUpdate: (event: TimeEvent) => {
      if (event.active_time_ms >= DEFAULT_CONFIG.timeSpentThresholdMs) {
        queueEvent('time_spent', {
          active_time_ms: event.active_time_ms,
          total_time_ms: event.total_time_ms,
          idle_time_ms: event.idle_time_ms,
          is_engaged: event.is_engaged,
        })
      }
    },
  })
  timeTracker.start()
  
  // Form tracker with universal support
  formTracker = new FormTracker({
    onFormEvent: (event: FormEvent) => {
      log('Form event:', event.event_type, event.form_id)
      queueEvent(event.event_type, {
        form_id: event.form_id,
        form_type: event.form_type,
        field_name: event.field_name,
        field_type: event.field_type,
        time_to_submit_ms: event.time_to_submit_ms,
        is_conversion: event.is_conversion,
      })
    },
  })
  formTracker.start()
  
  // Click tracking for links (basic)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')
    
    if (link && link.href) {
      const isExternal = link.hostname !== window.location.hostname
      queueEvent('click', {
        element: 'link',
        href: truncateText(link.href, 200),
        text: truncateText(link.textContent || '', 100),
        is_external: isExternal,
      })
    }
  })
}

/**
 * Queue an event for batched sending
 */
function queueEvent(eventType: string, data: Record<string, unknown>): void {
  if (!eventQueue) return
  
  eventQueue.push(eventType, {
    visitor_id: visitorId,
    session_id: sessionId,
    event_type: eventType,
    ...data,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    tracker_version: VERSION,
  })
}

/**
 * Handle SPA navigation
 */
function handleSPANavigation(event: NavigationEvent): void {
  log('SPA navigation:', event.navigation_type, event.to_url)
  
  // Flush pending events before navigation
  eventQueue?.flush()
  
  // Update ping service
  pingService?.updateScrollDepth(0)
  
  // Reset scroll tracker for new page
  scrollTracker?.stop()
  scrollTracker = new ScrollTracker({
    chunks: [30, 60, 90, 100],
    onChunkReached: (scrollEvent: ScrollEvent) => {
      queueEvent('scroll_depth', {
        depth: scrollEvent.depth,
        chunk: scrollEvent.chunk,
        time_to_reach_ms: scrollEvent.time_to_reach_ms,
      })
    },
  })
  scrollTracker.start()
  
  // Track the virtual pageview
  pageview(event.to_url)
  
  // Queue navigation event
  queueEvent('spa_navigation', {
    from_url: event.from_url,
    to_url: event.to_url,
    navigation_type: event.navigation_type,
    time_on_previous_page_ms: event.time_on_previous_page_ms,
  })
}

/**
 * Set up handlers for page unload
 */
function setupUnloadHandlers(): void {
  const handleUnload = (): void => {
    // Get final scroll depth
    const scrollEvent = scrollTracker?.getFinalEvent()
    if (scrollEvent) {
      sendBeacon(endpoint(DEFAULT_CONFIG.endpoints.behavioral), {
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: 'scroll_depth_final',
        data: scrollEvent,
        url: window.location.href,
      })
    }
    
    // Get final time metrics
    const timeEvent = timeTracker?.getFinalMetrics()
    if (timeEvent) {
      sendBeacon(endpoint(DEFAULT_CONFIG.endpoints.behavioral), {
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: 'time_spent_final',
        data: timeEvent,
        url: window.location.href,
      })
    }
    
    // Get agentic detection result
    const agenticResult = agenticAnalyzer?.getResult()
    if (agenticResult && agenticResult.agenticProbability > 0) {
      sendBeacon(endpoint(DEFAULT_CONFIG.endpoints.behavioral), {
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: 'agentic_detection',
        data: agenticResult,
        url: window.location.href,
      })
    }
    
    // Flush event queue
    eventQueue?.flushBeacon()
    
    // Force classify behavioral ML if not done
    if (behavioralClassifier && !behavioralClassifier.hasClassified()) {
      const result = behavioralClassifier.forceClassify()
      if (result) {
        handleBehavioralClassification(result)
      }
    }
  }
  
  window.addEventListener('beforeunload', handleUnload)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleUnload()
    }
  })
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
 * Set up behavioral ML signal collection (LOA-180)
 */
function setupBehavioralMLTracking(): void {
  if (!behavioralClassifier) return
  
  // Mouse movement tracking (sampled for performance)
  let mouseSampleCount = 0
  document.addEventListener('mousemove', (e) => {
    mouseSampleCount++
    // Sample every 10th event for performance
    if (mouseSampleCount % 10 === 0 && behavioralClassifier) {
      behavioralClassifier.recordMouse(e.clientX, e.clientY)
    }
  }, { passive: true })
  
  // Click tracking
  document.addEventListener('click', () => {
    if (behavioralClassifier) {
      behavioralClassifier.recordClick()
    }
  }, { passive: true })
  
  // Scroll tracking for ML (separate from milestone-based)
  let lastScrollY = 0
  document.addEventListener('scroll', () => {
    const currentY = window.scrollY
    if (Math.abs(currentY - lastScrollY) > 50 && behavioralClassifier) {
      lastScrollY = currentY
      behavioralClassifier.recordScroll(currentY)
    }
  }, { passive: true })
  
  // Focus/blur tracking
  document.addEventListener('focusin', (e) => {
    if (behavioralClassifier) {
      behavioralClassifier.recordFocusBlur('focus')
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        behavioralClassifier.recordFormStart(target.id || target.getAttribute('name') || 'unknown')
      }
    }
  }, { passive: true })
  
  document.addEventListener('focusout', (e) => {
    if (behavioralClassifier) {
      behavioralClassifier.recordFocusBlur('blur')
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        behavioralClassifier.recordFormEnd(target.id || target.getAttribute('name') || 'unknown')
      }
    }
  }, { passive: true })
  
  // Also try to classify after 30 seconds as backup
  setTimeout(() => {
    if (behavioralClassifier && !behavioralClassifier.hasClassified()) {
      behavioralClassifier.forceClassify()
    }
  }, 30000)
}

/**
 * Handle behavioral ML classification result
 */
function handleBehavioralClassification(result: BehavioralClassificationResult): void {
  log('Behavioral ML classification:', result)
  
  // Store result
  behavioralMLResult = {
    classification: result.classification,
    humanProbability: result.humanProbability,
    aiProbability: result.aiProbability,
    confidence: result.confidence,
    signals: result.signals,
    sessionDurationMs: result.sessionDurationMs,
  }
  
  // Send to backend
  queueEvent('ml_classification', {
    classification: result.classification,
    human_probability: result.humanProbability,
    ai_probability: result.aiProbability,
    confidence: result.confidence,
    signals: result.signals,
    session_duration_ms: result.sessionDurationMs,
    navigation_timing: navigationTiming,
    ai_detection: aiDetection,
    focus_blur: focusBlurResult,
  })
  
  // If AI-influenced detected with high confidence, update AI detection
  if (result.classification === 'ai_influenced' && result.confidence >= 0.7) {
    aiDetection = {
      isAI: true,
      confidence: result.confidence,
      method: 'behavioral',
    }
    log('AI detection updated from behavioral ML:', aiDetection)
  }
}

/**
 * Handle focus/blur analysis result (LOA-182)
 */
function handleFocusBlurAnalysis(result: FocusBlurResult): void {
  log('Focus/blur analysis:', result)
  
  // Store result
  focusBlurResult = {
    navType: result.nav_type,
    confidence: result.confidence,
    signals: result.signals,
    timeToFirstInteractionMs: result.time_to_first_interaction_ms,
  }
  
  // Send to backend
  queueEvent('focus_blur_analysis', {
    nav_type: result.nav_type,
    confidence: result.confidence,
    signals: result.signals,
    time_to_first_interaction_ms: result.time_to_first_interaction_ms,
    sequence_length: result.sequence.length,
  })
  
  // If paste pattern detected with confidence, update AI detection
  if (result.nav_type === 'likely_paste' && result.confidence >= 0.4) {
    // Only update if no stronger detection exists
    if (!aiDetection || aiDetection.confidence < result.confidence) {
      aiDetection = {
        isAI: true,
        confidence: result.confidence,
        method: 'behavioral',
      }
      log('AI detection updated from focus/blur analysis:', aiDetection)
    }
  }
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
 * Get behavioral ML classification result
 */
function getBehavioralMLResult(): BehavioralMLResult | null {
  return behavioralMLResult
}

/**
 * Get focus/blur analysis result
 */
function getFocusBlurResult(): FocusBlurMLResult | null {
  return focusBlurResult
}

/**
 * Get agentic browser detection result
 */
function getAgenticResult(): AgenticDetectionResult | null {
  return agenticAnalyzer?.getResult() || null
}

/**
 * Check if initialized
 */
function isTrackerInitialized(): boolean {
  return initialized
}

/**
 * Report tracker health status
 * Used for monitoring and debugging
 */
function reportHealth(status: 'initialized' | 'error' | 'ready', errorMessage?: string): void {
  if (!config.apiKey) return
  
  try {
    const healthData = {
      workspace_id: config.apiKey,
      status,
      error_message: errorMessage || null,
      version: VERSION,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
      features: {
        scroll_tracker: !!scrollTracker,
        time_tracker: !!timeTracker,
        form_tracker: !!formTracker,
        spa_router: !!spaRouter,
        behavioral_ml: !!behavioralClassifier,
        focus_blur: !!focusBlurAnalyzer,
        agentic: !!agenticAnalyzer,
        ping_service: !!pingService,
        event_queue: !!eventQueue,
      },
    }
    
    // Fire and forget
    safeFetch(endpoint(DEFAULT_CONFIG.endpoints.health), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(healthData),
    }).catch(() => {
      // Ignore health reporting errors
    })
    
    log('Health reported:', status)
  } catch {
    // Ignore
  }
}

/**
 * Reset the tracker
 */
function reset(): void {
  log('Resetting tracker')
  
  // Stop all services
  pingService?.stop()
  scrollTracker?.stop()
  timeTracker?.stop()
  formTracker?.stop()
  spaRouter?.stop()
  agenticAnalyzer?.destroy()
  
  // Reset state
  initialized = false
  visitorId = null
  sessionId = null
  navigationTiming = null
  aiDetection = null
  behavioralClassifier = null
  behavioralMLResult = null
  focusBlurAnalyzer = null
  focusBlurResult = null
  agenticAnalyzer = null
  eventQueue = null
  pingService = null
  scrollTracker = null
  timeTracker = null
  formTracker = null
  spaRouter = null
  
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
export const loamly: LoamlyTracker & { 
  getAgentic: () => AgenticDetectionResult | null 
  reportHealth: (status: 'initialized' | 'error' | 'ready', errorMessage?: string) => void
} = {
  init,
  pageview,
  track,
  conversion,
  identify,
  getSessionId: getCurrentSessionId,
  getVisitorId: getCurrentVisitorId,
  getAIDetection: getAIDetectionResult,
  getNavigationTiming: getNavigationTimingResult,
  getBehavioralML: getBehavioralMLResult,
  getFocusBlur: getFocusBlurResult,
  getAgentic: getAgenticResult,
  isInitialized: isTrackerInitialized,
  reset,
  debug: setDebug,
  reportHealth,
}

export default loamly
