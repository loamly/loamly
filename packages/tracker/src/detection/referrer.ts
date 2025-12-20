/**
 * Referrer-based AI Detection
 * 
 * Detects when users arrive from known AI platforms
 * based on the document.referrer header.
 * 
 * @module @loamly/tracker/detection
 */

import { AI_PLATFORMS } from '../config'
import type { AIDetectionResult } from '../types'

/**
 * Detect AI platform from referrer URL
 * 
 * @param referrer - The document.referrer value
 * @returns AI detection result or null if no AI detected
 */
export function detectAIFromReferrer(referrer: string): AIDetectionResult | null {
  if (!referrer) {
    return null
  }

  try {
    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase()

    // Check against known AI platforms
    for (const [pattern, platform] of Object.entries(AI_PLATFORMS)) {
      if (hostname.includes(pattern) || referrer.includes(pattern)) {
        return {
          isAI: true,
          platform,
          confidence: 0.95, // High confidence when referrer matches
          method: 'referrer',
        }
      }
    }

    return null
  } catch {
    // Invalid URL, try pattern matching on raw string
    for (const [pattern, platform] of Object.entries(AI_PLATFORMS)) {
      if (referrer.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          isAI: true,
          platform,
          confidence: 0.85,
          method: 'referrer',
        }
      }
    }
    return null
  }
}

/**
 * Extract AI platform from UTM parameters
 * 
 * @param url - The current page URL
 * @returns AI platform name or null
 */
export function detectAIFromUTM(url: string): AIDetectionResult | null {
  try {
    const params = new URL(url).searchParams
    
    // Check utm_source for AI platforms
    const utmSource = params.get('utm_source')?.toLowerCase()
    if (utmSource) {
      for (const [pattern, platform] of Object.entries(AI_PLATFORMS)) {
        if (utmSource.includes(pattern.split('.')[0])) {
          return {
            isAI: true,
            platform,
            confidence: 0.99, // Very high confidence from explicit UTM
            method: 'referrer',
          }
        }
      }
      
      // Generic AI source patterns
      if (utmSource.includes('ai') || utmSource.includes('llm') || utmSource.includes('chatbot')) {
        return {
          isAI: true,
          platform: utmSource,
          confidence: 0.9,
          method: 'referrer',
        }
      }
    }

    return null
  } catch {
    return null
  }
}

