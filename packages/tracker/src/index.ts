/**
 * Loamly Tracker
 * 
 * Open-source AI traffic detection for websites.
 * See what AI tells your customers — and track when they click.
 * 
 * @module @loamly/tracker
 * @version 1.8.0
 * @license MIT
 * @see https://github.com/loamly/loamly
 * @see https://loamly.ai
 */

// Core tracker
export { loamly, loamly as default } from './core'

// Types
export type {
  LoamlyConfig,
  LoamlyTracker,
  TrackEventOptions,
  NavigationTiming,
  AIDetectionResult,
} from './types'

// Detection utilities (for advanced usage)
export { detectNavigationType } from './detection/navigation-timing'
export { detectAIFromReferrer, detectAIFromUTM } from './detection/referrer'
export { 
  AgenticBrowserAnalyzer,
  createAgenticAnalyzer,
  type AgenticDetectionResult
} from './detection/agentic-browser'

// Configuration
export { VERSION, AI_PLATFORMS, AI_BOT_PATTERNS } from './config'


