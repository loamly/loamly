/**
 * Agentic Browser Detection
 * 
 * LOA-187: Detects AI agentic browsers like Perplexity Comet, ChatGPT Atlas,
 * and other automated browsing agents.
 * 
 * Detection methods:
 * - DOM fingerprinting (Perplexity Comet overlay)
 * - Mouse movement patterns (teleporting clicks)
 * - CDP (Chrome DevTools Protocol) automation fingerprint
 * - navigator.webdriver detection
 * 
 * @module @loamly/tracker/detection/agentic-browser
 * @license MIT
 */

/**
 * Agentic detection result
 */
export interface AgenticDetectionResult {
  /** Whether Perplexity Comet DOM element was detected */
  cometDOMDetected: boolean
  /** Whether CDP automation was detected */
  cdpDetected: boolean
  /** Mouse movement patterns */
  mousePatterns: {
    teleportingClicks: number
    totalMovements: number
  }
  /** Overall agentic probability (0-1) */
  agenticProbability: number
  /** Detection signals */
  signals: string[]
}

/**
 * Perplexity Comet DOM Detector
 * 
 * Detects the Comet browser overlay stop button which is injected
 * into the DOM when Comet is actively browsing.
 */
export class CometDetector {
  private detected = false
  private checkComplete = false
  private observer: MutationObserver | null = null

  /**
   * Initialize detection
   * @param timeout - Max time to observe for Comet DOM (default: 5s)
   */
  init(timeout = 5000): void {
    if (typeof document === 'undefined') return

    // Initial check
    this.check()

    if (!this.detected && document.body) {
      // Observe for dynamic injection
      this.observer = new MutationObserver(() => this.check())
      this.observer.observe(document.body, { childList: true, subtree: true })

      // Stop observing after timeout
      setTimeout(() => {
        if (this.observer && !this.detected) {
          this.observer.disconnect()
          this.observer = null
          this.checkComplete = true
        }
      }, timeout)
    }
  }

  private check(): void {
    // Perplexity Comet injects an overlay with this class
    if (document.querySelector('.pplx-agent-overlay-stop-button')) {
      this.detected = true
      this.checkComplete = true
      if (this.observer) {
        this.observer.disconnect()
        this.observer = null
      }
    }
  }

  isDetected(): boolean {
    return this.detected
  }

  isCheckComplete(): boolean {
    return this.checkComplete
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

/**
 * Mouse Movement Analyzer
 * 
 * Detects unnatural mouse movements characteristic of automated browsers:
 * - Teleporting clicks (instant large movements)
 * - Perfect linear movements
 * - No micro-adjustments
 */
export class MouseAnalyzer {
  private lastX = -1
  private lastY = -1
  private teleportingClicks = 0
  private totalMovements = 0
  private readonly teleportThreshold: number

  /**
   * @param teleportThreshold - Distance in pixels to consider a teleport (default: 500)
   */
  constructor(teleportThreshold = 500) {
    this.teleportThreshold = teleportThreshold
  }

  /**
   * Initialize mouse tracking
   */
  init(): void {
    if (typeof document === 'undefined') return

    document.addEventListener('mousemove', this.handleMove, { passive: true })
    document.addEventListener('mousedown', this.handleClick, { passive: true })
  }

  private handleMove = (e: MouseEvent): void => {
    this.totalMovements++
    this.lastX = e.clientX
    this.lastY = e.clientY
  }

  private handleClick = (e: MouseEvent): void => {
    if (this.lastX !== -1 && this.lastY !== -1) {
      const dx = Math.abs(e.clientX - this.lastX)
      const dy = Math.abs(e.clientY - this.lastY)

      // Large instant movement before click = teleporting
      if (dx > this.teleportThreshold || dy > this.teleportThreshold) {
        this.teleportingClicks++
      }
    }
    this.lastX = e.clientX
    this.lastY = e.clientY
  }

  getPatterns(): { teleportingClicks: number; totalMovements: number } {
    return {
      teleportingClicks: this.teleportingClicks,
      totalMovements: this.totalMovements,
    }
  }

  destroy(): void {
    if (typeof document === 'undefined') return
    document.removeEventListener('mousemove', this.handleMove)
    document.removeEventListener('mousedown', this.handleClick)
  }
}

/**
 * CDP (Chrome DevTools Protocol) Automation Detector
 * 
 * Detects headless browsers and automation tools:
 * - navigator.webdriver (set by Selenium, Puppeteer, Playwright)
 * - Chrome automation flags
 * - Missing browser APIs
 */
export class CDPDetector {
  private detected = false

  /**
   * Run detection checks
   */
  detect(): boolean {
    if (typeof navigator === 'undefined') return false

    // Check 1: navigator.webdriver (Chrome 76+, Firefox 60+)
    // Set to true by automation frameworks
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver) {
      this.detected = true
      return true
    }

    // Check 2: Chrome automation extension (legacy check)
    if (typeof window !== 'undefined') {
      const win = window as Window & {
        chrome?: { runtime?: unknown }
        __webdriver_evaluate?: unknown
        __selenium_evaluate?: unknown
        __webdriver_script_function?: unknown
        __webdriver_script_func?: unknown
        __webdriver_script_fn?: unknown
        __fxdriver_evaluate?: unknown
        __driver_unwrapped?: unknown
        __webdriver_unwrapped?: unknown
        __driver_evaluate?: unknown
        __selenium_unwrapped?: unknown
        __fxdriver_unwrapped?: unknown
      }

      // Selenium/WebDriver fingerprints
      const automationProps = [
        '__webdriver_evaluate',
        '__selenium_evaluate',
        '__webdriver_script_function',
        '__webdriver_script_func',
        '__webdriver_script_fn',
        '__fxdriver_evaluate',
        '__driver_unwrapped',
        '__webdriver_unwrapped',
        '__driver_evaluate',
        '__selenium_unwrapped',
        '__fxdriver_unwrapped',
      ]

      for (const prop of automationProps) {
        if (prop in win) {
          this.detected = true
          return true
        }
      }
    }

    return false
  }

  isDetected(): boolean {
    return this.detected
  }
}

/**
 * Agentic Browser Analyzer
 * 
 * Combines all detection methods into a unified result.
 */
export class AgenticBrowserAnalyzer {
  private cometDetector: CometDetector
  private mouseAnalyzer: MouseAnalyzer
  private cdpDetector: CDPDetector
  private initialized = false

  constructor() {
    this.cometDetector = new CometDetector()
    this.mouseAnalyzer = new MouseAnalyzer()
    this.cdpDetector = new CDPDetector()
  }

  /**
   * Initialize all detectors
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    this.cometDetector.init()
    this.mouseAnalyzer.init()
    this.cdpDetector.detect()
  }

  /**
   * Get current detection result
   */
  getResult(): AgenticDetectionResult {
    const signals: string[] = []
    let probability = 0

    // Comet detection (85% confidence)
    if (this.cometDetector.isDetected()) {
      signals.push('comet_dom_detected')
      probability = Math.max(probability, 0.85)
    }

    // CDP detection (92% confidence)
    if (this.cdpDetector.isDetected()) {
      signals.push('cdp_detected')
      probability = Math.max(probability, 0.92)
    }

    // Mouse patterns (78% confidence per teleport)
    const mousePatterns = this.mouseAnalyzer.getPatterns()
    if (mousePatterns.teleportingClicks > 0) {
      signals.push(`teleporting_clicks:${mousePatterns.teleportingClicks}`)
      probability = Math.max(probability, 0.78)
    }

    return {
      cometDOMDetected: this.cometDetector.isDetected(),
      cdpDetected: this.cdpDetector.isDetected(),
      mousePatterns,
      agenticProbability: probability,
      signals,
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cometDetector.destroy()
    this.mouseAnalyzer.destroy()
  }
}

/**
 * Create and initialize an agentic browser analyzer
 */
export function createAgenticAnalyzer(): AgenticBrowserAnalyzer {
  const analyzer = new AgenticBrowserAnalyzer()

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => analyzer.init())
    } else {
      analyzer.init()
    }
  }

  return analyzer
}

