/**
 * Loamly Tracker - Browser Bundle (IIFE)
 * 
 * This file is the entry point for the browser script tag version.
 * It auto-initializes from script tag attributes or URL parameters.
 * 
 * Usage Options:
 * 1. CDN with domain parameter:
 *    <script src="https://app.loamly.ai/t.js?d=your-domain.com"></script>
 * 
 * 2. npm with data attributes:
 *    <script src="https://cdn.jsdelivr.net/npm/@loamly/tracker" data-api-key="your-key"></script>
 * 
 * 3. Self-hosted with manual init:
 *    <script src="/tracker.js"></script>
 *    <script>loamly.init({ apiKey: 'your-key' })</script>
 * 
 * @module @loamly/tracker/browser
 */

import { loamly } from './core'
import type { LoamlyConfig } from './types'
import { DEFAULT_CONFIG } from './config'

/**
 * Extract domain from script URL ?d= parameter
 */
function extractDomainFromScriptUrl(): string | null {
  const scripts = document.getElementsByTagName('script')
  
  for (const script of scripts) {
    const src = script.src
    if (src.includes('t.js') || src.includes('loamly')) {
      try {
        const url = new URL(src)
        const domain = url.searchParams.get('d')
        if (domain) return domain
      } catch {
        // Invalid URL, continue
      }
    }
  }
  
  return null
}

/**
 * Resolve workspace configuration from domain
 */
async function resolveWorkspaceConfig(domain: string): Promise<LoamlyConfig | null> {
  try {
    const response = await fetch(`${DEFAULT_CONFIG.apiHost}${DEFAULT_CONFIG.endpoints.resolve}?domain=${encodeURIComponent(domain)}`)
    
    if (!response.ok) {
      console.warn('[Loamly] Failed to resolve workspace for domain:', domain)
      return null
    }
    
    const data = await response.json()
    
    if (data.workspace_id) {
      return {
        apiKey: data.workspace_api_key,
        apiHost: DEFAULT_CONFIG.apiHost,
      }
    }
    
    return null
  } catch (error) {
    console.warn('[Loamly] Error resolving workspace:', error)
    return null
  }
}

/**
 * Extract config from script tag data attributes
 */
function extractConfigFromDataAttributes(): LoamlyConfig | null {
  const scripts = document.getElementsByTagName('script')
  
  for (const script of scripts) {
    if (script.src.includes('loamly') || script.dataset.loamly !== undefined) {
      const config: LoamlyConfig = {}
      
      if (script.dataset.apiKey) {
        config.apiKey = script.dataset.apiKey
      }
      
      if (script.dataset.apiHost) {
        config.apiHost = script.dataset.apiHost
      }
      
      if (script.dataset.debug === 'true') {
        config.debug = true
      }
      
      if (script.dataset.disableAutoPageview === 'true') {
        config.disableAutoPageview = true
      }
      
      if (script.dataset.disableBehavioral === 'true') {
        config.disableBehavioral = true
      }
      
      if (config.apiKey) {
        return config
      }
    }
  }
  
  return null
}

/**
 * Auto-initialize the tracker
 */
async function autoInit(): Promise<void> {
  // Priority 1: Domain parameter in script URL (?d=domain.com)
  const domain = extractDomainFromScriptUrl()
  
  if (domain) {
    const resolvedConfig = await resolveWorkspaceConfig(domain)
    if (resolvedConfig) {
      loamly.init(resolvedConfig)
      return
    }
  }
  
  // Priority 2: Data attributes on script tag
  const dataConfig = extractConfigFromDataAttributes()
  if (dataConfig) {
    loamly.init(dataConfig)
    return
  }
  
  // Priority 3: Current domain auto-detection (for app.loamly.ai hosted script)
  const currentDomain = window.location.hostname
  if (currentDomain && currentDomain !== 'localhost') {
    const resolvedConfig = await resolveWorkspaceConfig(currentDomain)
    if (resolvedConfig) {
      loamly.init(resolvedConfig)
      return
    }
  }
  
  // No configuration found, tracker not initialized
  // User can manually call loamly.init() later
}

// Run auto-init when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Use requestIdleCallback if available for non-blocking init
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => autoInit())
      } else {
        setTimeout(autoInit, 0)
      }
    })
  } else {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => autoInit())
    } else {
      setTimeout(autoInit, 0)
    }
  }
}

// Export for manual usage
export { loamly }
export default loamly
