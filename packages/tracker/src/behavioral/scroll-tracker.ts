/**
 * Advanced Scroll Depth Tracker
 * 
 * Production-grade scroll tracking with:
 * - 30% chunk reporting (30%, 60%, 90%, 100%)
 * - requestAnimationFrame throttling for performance
 * - Visibility-aware (only tracks when visible)
 * - Max depth tracking
 * 
 * @module @loamly/tracker
 */

export interface ScrollEvent {
  depth: number
  chunk: number // 30, 60, 90, 100
  time_to_reach_ms: number
  total_height: number
  viewport_height: number
}

export interface ScrollTrackerConfig {
  chunks: number[] // Default: [30, 60, 90, 100]
  onChunkReached?: (event: ScrollEvent) => void
  onDepthChange?: (depth: number) => void
}

const DEFAULT_CHUNKS = [30, 60, 90, 100]

export class ScrollTracker {
  private config: ScrollTrackerConfig
  private maxDepth = 0
  private reportedChunks = new Set<number>()
  private startTime: number
  private ticking = false
  private isVisible = true

  constructor(config: Partial<ScrollTrackerConfig> = {}) {
    this.config = {
      chunks: DEFAULT_CHUNKS,
      ...config,
    }
    this.startTime = Date.now()
  }

  /**
   * Start tracking scroll depth
   */
  start(): void {
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibility)
    
    // Check initial scroll position (for page refresh)
    this.checkScrollDepth()
  }

  /**
   * Stop tracking
   */
  stop(): void {
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  /**
   * Get current max scroll depth
   */
  getMaxDepth(): number {
    return this.maxDepth
  }

  /**
   * Get reported chunks
   */
  getReportedChunks(): number[] {
    return Array.from(this.reportedChunks).sort((a, b) => a - b)
  }

  /**
   * Get final scroll event (for unload)
   */
  getFinalEvent(): ScrollEvent {
    const docHeight = document.documentElement.scrollHeight
    const viewportHeight = window.innerHeight

    return {
      depth: this.maxDepth,
      chunk: this.getChunkForDepth(this.maxDepth),
      time_to_reach_ms: Date.now() - this.startTime,
      total_height: docHeight,
      viewport_height: viewportHeight,
    }
  }

  private handleScroll = (): void => {
    if (!this.ticking && this.isVisible) {
      requestAnimationFrame(() => {
        this.checkScrollDepth()
        this.ticking = false
      })
      this.ticking = true
    }
  }

  private handleVisibility = (): void => {
    this.isVisible = document.visibilityState === 'visible'
  }

  private checkScrollDepth(): void {
    const scrollY = window.scrollY
    const viewportHeight = window.innerHeight
    const docHeight = document.documentElement.scrollHeight
    
    // Avoid division by zero
    if (docHeight <= viewportHeight) {
      this.updateDepth(100)
      return
    }

    const scrollableHeight = docHeight - viewportHeight
    const currentDepth = Math.min(100, Math.round((scrollY / scrollableHeight) * 100))
    
    this.updateDepth(currentDepth)
  }

  private updateDepth(depth: number): void {
    if (depth <= this.maxDepth) return
    
    this.maxDepth = depth
    this.config.onDepthChange?.(depth)

    // Check for chunk milestones
    for (const chunk of this.config.chunks!) {
      if (depth >= chunk && !this.reportedChunks.has(chunk)) {
        this.reportedChunks.add(chunk)
        this.reportChunk(chunk)
      }
    }
  }

  private reportChunk(chunk: number): void {
    const docHeight = document.documentElement.scrollHeight
    const viewportHeight = window.innerHeight

    const event: ScrollEvent = {
      depth: this.maxDepth,
      chunk,
      time_to_reach_ms: Date.now() - this.startTime,
      total_height: docHeight,
      viewport_height: viewportHeight,
    }

    this.config.onChunkReached?.(event)
  }

  private getChunkForDepth(depth: number): number {
    const chunks = this.config.chunks!.sort((a, b) => b - a)
    for (const chunk of chunks) {
      if (depth >= chunk) return chunk
    }
    return 0
  }
}

