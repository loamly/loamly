/**
 * Real-time Ping Service
 * 
 * Heartbeat for active session tracking with:
 * - Configurable interval (default 30s)
 * - Visibility-aware (pauses when tab hidden)
 * - Session metrics aggregation
 * 
 * @module @loamly/tracker
 */

import { DEFAULT_CONFIG } from '../config'

export interface PingData {
  session_id: string
  visitor_id: string
  url: string
  time_on_page_ms: number
  scroll_depth: number
  is_active: boolean
  tracker_version: string
}

export interface PingConfig {
  interval: number
  endpoint: string
  onPing?: (data: PingData) => void
}

export class PingService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private config: PingConfig
  private pageLoadTime: number
  private isVisible = true
  private isFocused = true
  private currentScrollDepth = 0
  private sessionId: string
  private visitorId: string
  private version: string

  constructor(
    sessionId: string,
    visitorId: string,
    version: string,
    config: Partial<PingConfig> = {}
  ) {
    this.sessionId = sessionId
    this.visitorId = visitorId
    this.version = version
    this.pageLoadTime = Date.now()
    this.isVisible = document.visibilityState === 'visible'
    this.isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true
    this.config = {
      interval: DEFAULT_CONFIG.pingInterval,
      endpoint: '',
      ...config,
    }

    // Track visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('focus', this.handleFocusChange)
    window.addEventListener('blur', this.handleFocusChange)
    
    // Track scroll depth
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  }

  /**
   * Start the ping service
   */
  start(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      if (this.isVisible && this.isFocused) {
        this.ping()
      }
    }, this.config.interval)

    // Send initial ping
    if (this.isVisible && this.isFocused) {
      this.ping()
    }
  }

  /**
   * Stop the ping service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('focus', this.handleFocusChange)
    window.removeEventListener('blur', this.handleFocusChange)
    window.removeEventListener('scroll', this.handleScroll)
  }

  /**
   * Update scroll depth (called by external scroll tracker)
   */
  updateScrollDepth(depth: number): void {
    if (depth > this.currentScrollDepth) {
      this.currentScrollDepth = depth
    }
  }

  /**
   * Get current ping data
   */
  getData(): PingData {
    return {
      session_id: this.sessionId,
      visitor_id: this.visitorId,
      url: window.location.href,
      time_on_page_ms: Date.now() - this.pageLoadTime,
      scroll_depth: this.currentScrollDepth,
      is_active: this.isVisible && this.isFocused,
      tracker_version: this.version,
    }
  }

  private ping = async (): Promise<void> => {
    const data = this.getData()

    // Call callback if provided
    this.config.onPing?.(data)

    // Send to endpoint if configured
    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } catch {
        // Ping failures are silent
      }
    }
  }

  private handleVisibilityChange = (): void => {
    this.isVisible = document.visibilityState === 'visible'
  }

  private handleFocusChange = (): void => {
    this.isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true
    if (this.intervalId && this.isVisible && this.isFocused) {
      this.ping()
    }
  }

  private handleScroll = (): void => {
    const scrollPercent = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
    )
    if (scrollPercent > this.currentScrollDepth) {
      this.currentScrollDepth = Math.min(scrollPercent, 100)
    }
  }
}

