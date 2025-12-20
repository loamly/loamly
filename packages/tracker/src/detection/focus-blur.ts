/**
 * Focus/Blur Event Sequence Analysis
 * 
 * LOA-182: Detects paste vs click navigation patterns by analyzing
 * the sequence of focus and blur events when a page loads.
 * 
 * Research: 55-65% accuracy (improves when combined with other signals)
 * 
 * @module @loamly/tracker/detection/focus-blur
 */

/**
 * Focus/blur event record
 */
export interface FocusBlurEvent {
  type: 'focus' | 'blur' | 'window_focus' | 'window_blur'
  target: string
  timestamp: number
}

/**
 * Focus/blur analysis result
 */
export interface FocusBlurResult {
  /** Navigation pattern type */
  nav_type: 'likely_paste' | 'likely_click' | 'unknown'
  /** Confidence score (0-1) */
  confidence: number
  /** Detection signals */
  signals: string[]
  /** Event sequence (last 10 events) */
  sequence: FocusBlurEvent[]
  /** Time from page load to first interaction */
  time_to_first_interaction_ms: number | null
}

/**
 * Focus/Blur Sequence Analyzer
 * 
 * Tracks focus and blur events to detect paste navigation patterns.
 * Paste navigation typically shows:
 * 1. Early window focus event
 * 2. Body focus without prior link navigation
 * 3. No referrer blur pattern
 */
export class FocusBlurAnalyzer {
  private sequence: FocusBlurEvent[] = []
  private pageLoadTime: number
  private firstInteractionTime: number | null = null
  private analyzed = false
  private result: FocusBlurResult | null = null

  constructor() {
    this.pageLoadTime = performance.now()
  }

  /**
   * Initialize event tracking
   * Must be called after DOM is ready
   */
  initTracking(): void {
    // Track focus events (use capturing phase to catch all events)
    document.addEventListener('focus', (e) => {
      this.recordEvent('focus', e.target as HTMLElement)
    }, true)

    document.addEventListener('blur', (e) => {
      this.recordEvent('blur', e.target as HTMLElement)
    }, true)

    // Track window focus/blur
    window.addEventListener('focus', () => {
      this.recordEvent('window_focus', null)
    })

    window.addEventListener('blur', () => {
      this.recordEvent('window_blur', null)
    })

    // Track first click/keypress as first interaction
    const recordFirstInteraction = () => {
      if (this.firstInteractionTime === null) {
        this.firstInteractionTime = performance.now()
      }
    }
    document.addEventListener('click', recordFirstInteraction, { once: true, passive: true })
    document.addEventListener('keydown', recordFirstInteraction, { once: true, passive: true })
  }

  /**
   * Record a focus/blur event
   */
  private recordEvent(type: FocusBlurEvent['type'], target: HTMLElement | null): void {
    const event: FocusBlurEvent = {
      type,
      target: target?.tagName || 'WINDOW',
      timestamp: performance.now()
    }
    
    this.sequence.push(event)
    
    // Keep only last 20 events to limit memory
    if (this.sequence.length > 20) {
      this.sequence = this.sequence.slice(-20)
    }
  }

  /**
   * Analyze the focus/blur sequence for paste patterns
   */
  analyze(): FocusBlurResult {
    if (this.analyzed && this.result) {
      return this.result
    }

    const signals: string[] = []
    let confidence = 0
    
    // Get early events (first 500ms after page load)
    const earlyEvents = this.sequence.filter(e => e.timestamp < this.pageLoadTime + 500)
    
    // Pattern 1: Window focus as first event
    const hasEarlyWindowFocus = earlyEvents.some(e => e.type === 'window_focus')
    if (hasEarlyWindowFocus) {
      signals.push('early_window_focus')
      confidence += 0.15
    }
    
    // Pattern 2: Body focus early (paste causes immediate body focus)
    const hasEarlyBodyFocus = earlyEvents.some(
      e => e.type === 'focus' && e.target === 'BODY'
    )
    if (hasEarlyBodyFocus) {
      signals.push('early_body_focus')
      confidence += 0.15
    }
    
    // Pattern 3: No link/anchor focus (would indicate click navigation)
    const hasLinkFocus = this.sequence.some(
      e => e.type === 'focus' && e.target === 'A'
    )
    if (!hasLinkFocus) {
      signals.push('no_link_focus')
      confidence += 0.10
    }
    
    // Pattern 4: First focus is on document/body (not a specific element)
    const firstFocus = this.sequence.find(e => e.type === 'focus')
    if (firstFocus && (firstFocus.target === 'BODY' || firstFocus.target === 'HTML')) {
      signals.push('first_focus_body')
      confidence += 0.10
    }
    
    // Pattern 5: No rapid tab switching (common in human navigation)
    const windowEvents = this.sequence.filter(
      e => e.type === 'window_focus' || e.type === 'window_blur'
    )
    if (windowEvents.length <= 2) {
      signals.push('minimal_window_switches')
      confidence += 0.05
    }
    
    // Pattern 6: Time to first interaction
    // Paste users often have longer time before first interaction
    // (reading content they copied from AI)
    if (this.firstInteractionTime !== null) {
      const timeToInteraction = this.firstInteractionTime - this.pageLoadTime
      if (timeToInteraction > 3000) {
        signals.push('delayed_first_interaction')
        confidence += 0.10
      }
    }
    
    // Cap confidence based on research (55-65% accuracy)
    confidence = Math.min(confidence, 0.65)
    
    // Determine navigation type
    let navType: FocusBlurResult['nav_type']
    if (confidence >= 0.35) {
      navType = 'likely_paste'
    } else if (signals.length === 0) {
      navType = 'unknown'
    } else {
      navType = 'likely_click'
    }
    
    this.result = {
      nav_type: navType,
      confidence,
      signals,
      sequence: this.sequence.slice(-10),
      time_to_first_interaction_ms: this.firstInteractionTime 
        ? Math.round(this.firstInteractionTime - this.pageLoadTime)
        : null
    }
    
    this.analyzed = true
    return this.result
  }

  /**
   * Get current result (analyze if not done)
   */
  getResult(): FocusBlurResult {
    return this.analyze()
  }

  /**
   * Check if analysis has been performed
   */
  hasAnalyzed(): boolean {
    return this.analyzed
  }

  /**
   * Get the raw sequence for debugging
   */
  getSequence(): FocusBlurEvent[] {
    return [...this.sequence]
  }

  /**
   * Reset the analyzer
   */
  reset(): void {
    this.sequence = []
    this.pageLoadTime = performance.now()
    this.firstInteractionTime = null
    this.analyzed = false
    this.result = null
  }
}

/**
 * Create a new focus/blur analyzer
 */
export function createFocusBlurAnalyzer(): FocusBlurAnalyzer {
  const analyzer = new FocusBlurAnalyzer()
  
  // Initialize tracking when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => analyzer.initTracking())
    } else {
      analyzer.initTracking()
    }
  }
  
  return analyzer
}

