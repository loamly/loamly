/**
 * Utility functions for Loamly Tracker
 * @module @loamly/tracker
 */

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get or create a persistent visitor ID
 * (Privacy-respecting, no cookies)
 */
export function getVisitorId(): string {
  // Try to get from localStorage first
  try {
    const stored = localStorage.getItem('_loamly_vid')
    if (stored) return stored
    
    const newId = generateUUID()
    localStorage.setItem('_loamly_vid', newId)
    return newId
  } catch {
    // localStorage not available, generate ephemeral ID
    return generateUUID()
  }
}

/**
 * Get or create a session ID using sessionStorage
 * (Cookie-free session tracking)
 */
export function getSessionId(): { sessionId: string; isNew: boolean } {
  try {
    const storedSession = sessionStorage.getItem('loamly_session')
    const storedStart = sessionStorage.getItem('loamly_start')
    
    if (storedSession && storedStart) {
      return { sessionId: storedSession, isNew: false }
    }
    
    const newSession = generateUUID()
    const startTime = Date.now().toString()
    
    sessionStorage.setItem('loamly_session', newSession)
    sessionStorage.setItem('loamly_start', startTime)
    
    return { sessionId: newSession, isNew: true }
  } catch {
    // sessionStorage not available
    return { sessionId: generateUUID(), isNew: true }
  }
}

/**
 * Extract UTM parameters from URL
 */
export function extractUTMParams(url: string): Record<string, string> {
  const params: Record<string, string> = {}
  
  try {
    const searchParams = new URL(url).searchParams
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    
    for (const key of utmKeys) {
      const value = searchParams.get(key)
      if (value) params[key] = value
    }
  } catch {
    // Invalid URL
  }
  
  return params
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Safe fetch with timeout
 */
export async function safeFetch(
  url: string,
  options: RequestInit,
  timeout = 10000
): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response
  } catch {
    return null
  }
}

/**
 * Send beacon (for unload events)
 */
export function sendBeacon(url: string, data: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    return navigator.sendBeacon(url, JSON.stringify(data))
  }
  return false
}


