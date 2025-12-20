/**
 * Navigation Timing API Detection
 * 
 * Detects whether the user arrived via paste (from AI chat) vs click
 * by analyzing Navigation Timing API patterns.
 * 
 * @module @loamly/tracker/detection
 */

import type { NavigationTiming } from '../types'

/**
 * Analyze Navigation Timing API to detect paste vs click navigation
 * 
 * When users paste a URL (common after copying from AI chat), 
 * the timing patterns are distinctive:
 * 1. fetchStart is virtually immediate after navigationStart
 * 2. DNS/connect times are often 0 (cached or direct)
 * 3. No redirect chain
 * 4. Uniform timing patterns
 * 
 * @returns NavigationTiming result with type and confidence
 */
export function detectNavigationType(): NavigationTiming {
  try {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    
    if (!entries || entries.length === 0) {
      return { nav_type: 'unknown', confidence: 0, signals: ['no_timing_data'] }
    }

    const nav = entries[0]
    const signals: string[] = []
    let pasteScore = 0

    // Signal 1: fetchStart delta from navigationStart
    // Paste navigation typically has very small delta (< 5ms)
    const fetchStartDelta = nav.fetchStart - nav.startTime
    if (fetchStartDelta < 5) {
      pasteScore += 0.25
      signals.push('instant_fetch_start')
    } else if (fetchStartDelta < 20) {
      pasteScore += 0.15
      signals.push('fast_fetch_start')
    }

    // Signal 2: DNS lookup time
    // Paste = likely 0 (direct URL entry, no link warmup)
    const dnsTime = nav.domainLookupEnd - nav.domainLookupStart
    if (dnsTime === 0) {
      pasteScore += 0.15
      signals.push('no_dns_lookup')
    }

    // Signal 3: TCP connect time
    // Paste = likely 0 (no preconnect from previous page)
    const connectTime = nav.connectEnd - nav.connectStart
    if (connectTime === 0) {
      pasteScore += 0.15
      signals.push('no_tcp_connect')
    }

    // Signal 4: No redirects
    // Paste URLs are typically direct, no redirects
    if (nav.redirectCount === 0) {
      pasteScore += 0.1
      signals.push('no_redirects')
    }

    // Signal 5: Timing uniformity check
    // Paste navigation tends to have more uniform patterns
    const timingVariance = calculateTimingVariance(nav)
    if (timingVariance < 10) {
      pasteScore += 0.15
      signals.push('uniform_timing')
    }

    // Signal 6: No referrer (common for paste)
    if (!document.referrer || document.referrer === '') {
      pasteScore += 0.1
      signals.push('no_referrer')
    }

    // Determine navigation type based on score
    const confidence = Math.min(pasteScore, 1)
    const nav_type = pasteScore >= 0.5 ? 'likely_paste' : 'likely_click'

    return {
      nav_type,
      confidence: Math.round(confidence * 1000) / 1000,
      signals,
    }
  } catch {
    return { nav_type: 'unknown', confidence: 0, signals: ['detection_error'] }
  }
}

/**
 * Calculate timing variance to detect paste patterns
 */
function calculateTimingVariance(nav: PerformanceNavigationTiming): number {
  const timings = [
    nav.fetchStart - nav.startTime,
    nav.domainLookupEnd - nav.domainLookupStart,
    nav.connectEnd - nav.connectStart,
    nav.responseStart - nav.requestStart,
  ].filter((t) => t >= 0)

  if (timings.length === 0) return 100

  const mean = timings.reduce((a, b) => a + b, 0) / timings.length
  const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length
  
  return Math.sqrt(variance)
}

