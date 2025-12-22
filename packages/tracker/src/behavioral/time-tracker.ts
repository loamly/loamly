/**
 * Time Spent Tracker
 * 
 * Accurate time-on-page tracking with:
 * - Visibility-aware (pauses when tab hidden)
 * - Heartbeat updates
 * - Engagement detection (active vs idle)
 * 
 * @module @loamly/tracker
 */

export interface TimeEvent {
  active_time_ms: number
  total_time_ms: number
  idle_time_ms: number
  is_engaged: boolean
}

export interface TimeTrackerConfig {
  idleThresholdMs: number // Time without interaction to consider idle
  updateIntervalMs: number // How often to report time
  onUpdate?: (event: TimeEvent) => void
}

const DEFAULT_CONFIG: TimeTrackerConfig = {
  idleThresholdMs: 30000, // 30 seconds
  updateIntervalMs: 5000, // 5 seconds
}

export class TimeTracker {
  private config: TimeTrackerConfig
  private startTime: number
  private activeTime = 0
  private idleTime = 0
  private lastActivityTime: number
  private lastUpdateTime: number
  private isVisible = true
  private isIdle = false
  private updateInterval: ReturnType<typeof setInterval> | null = null
  private idleCheckInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<TimeTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startTime = Date.now()
    this.lastActivityTime = this.startTime
    this.lastUpdateTime = this.startTime
  }

  /**
   * Start tracking time
   */
  start(): void {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibility)

    // Listen for user activity
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
    activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true })
    })

    // Start update interval
    this.updateInterval = setInterval(() => {
      this.update()
    }, this.config.updateIntervalMs)

    // Start idle check
    this.idleCheckInterval = setInterval(() => {
      this.checkIdle()
    }, 1000)
  }

  /**
   * Stop tracking
   */
  stop(): void {
    document.removeEventListener('visibilitychange', this.handleVisibility)
    
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
    activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity)
    })

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = null
    }
  }

  /**
   * Get current time metrics
   */
  getMetrics(): TimeEvent {
    this.updateTimes()
    
    return {
      active_time_ms: this.activeTime,
      total_time_ms: Date.now() - this.startTime,
      idle_time_ms: this.idleTime,
      is_engaged: !this.isIdle && this.isVisible,
    }
  }

  /**
   * Get final metrics (for unload)
   */
  getFinalMetrics(): TimeEvent {
    this.updateTimes()
    return this.getMetrics()
  }

  private handleVisibility = (): void => {
    const wasVisible = this.isVisible
    this.isVisible = document.visibilityState === 'visible'

    if (wasVisible && !this.isVisible) {
      // Tab hidden - update times before stopping
      this.updateTimes()
    } else if (!wasVisible && this.isVisible) {
      // Tab shown - resume tracking
      this.lastUpdateTime = Date.now()
      this.lastActivityTime = Date.now()
    }
  }

  private handleActivity = (): void => {
    const now = Date.now()
    
    if (this.isIdle) {
      // Was idle, now active
      this.isIdle = false
    }
    
    this.lastActivityTime = now
  }

  private checkIdle(): void {
    const now = Date.now()
    const timeSinceActivity = now - this.lastActivityTime

    if (!this.isIdle && timeSinceActivity >= this.config.idleThresholdMs) {
      // User went idle
      this.isIdle = true
    }
  }

  private updateTimes(): void {
    const now = Date.now()
    const elapsed = now - this.lastUpdateTime

    if (this.isVisible) {
      if (this.isIdle) {
        this.idleTime += elapsed
      } else {
        this.activeTime += elapsed
      }
    }

    this.lastUpdateTime = now
  }

  private update(): void {
    if (!this.isVisible) return

    this.updateTimes()
    this.config.onUpdate?.(this.getMetrics())
  }
}

