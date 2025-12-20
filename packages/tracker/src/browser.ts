/**
 * Loamly Tracker - Browser Bundle (IIFE)
 * 
 * This file is the entry point for the browser script tag version.
 * It auto-initializes from data attributes on the script tag.
 * 
 * Usage:
 * <script src="https://unpkg.com/@loamly/tracker" data-api-key="your-key"></script>
 * 
 * @module @loamly/tracker/browser
 */

import { loamly } from './core'
import type { LoamlyConfig } from './types'

// Auto-initialize from script tag data attributes
function autoInit(): void {
  // Find the script tag that loaded us
  const scripts = document.getElementsByTagName('script')
  let scriptTag: HTMLScriptElement | null = null
  
  for (const script of scripts) {
    if (script.src.includes('loamly') || script.dataset.loamly !== undefined) {
      scriptTag = script
      break
    }
  }

  if (!scriptTag) {
    // No matching script tag found, don't auto-init
    return
  }

  // Extract configuration from data attributes
  const config: LoamlyConfig = {}
  
  if (scriptTag.dataset.apiKey) {
    config.apiKey = scriptTag.dataset.apiKey
  }
  
  if (scriptTag.dataset.apiHost) {
    config.apiHost = scriptTag.dataset.apiHost
  }
  
  if (scriptTag.dataset.debug === 'true') {
    config.debug = true
  }
  
  if (scriptTag.dataset.disableAutoPageview === 'true') {
    config.disableAutoPageview = true
  }
  
  if (scriptTag.dataset.disableBehavioral === 'true') {
    config.disableBehavioral = true
  }

  // Initialize if we have configuration
  if (config.apiKey || scriptTag.dataset.loamly !== undefined) {
    loamly.init(config)
  }
}

// Run auto-init when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit)
  } else {
    // Use requestIdleCallback if available for non-blocking init
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(autoInit)
    } else {
      setTimeout(autoInit, 0)
    }
  }
}

// Export for manual usage
export { loamly }
export default loamly


