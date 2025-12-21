/**
 * AI Traffic Detection Module
 * 
 * Revolutionary methods for detecting "dark" AI traffic that
 * traditional analytics miss.
 * 
 * @module @loamly/tracker/detection
 * @license MIT
 */

export { detectNavigationType } from './navigation-timing'
export { detectAIFromReferrer, detectAIFromUTM } from './referrer'
export { 
  BehavioralClassifier, 
  createBehavioralClassifier,
  type BehavioralSignal,
  type BehavioralClassificationResult 
} from './behavioral-classifier'
export {
  FocusBlurAnalyzer,
  createFocusBlurAnalyzer,
  type FocusBlurEvent,
  type FocusBlurResult
} from './focus-blur'
export {
  AgenticBrowserAnalyzer,
  CometDetector,
  MouseAnalyzer,
  CDPDetector,
  createAgenticAnalyzer,
  type AgenticDetectionResult
} from './agentic-browser'
