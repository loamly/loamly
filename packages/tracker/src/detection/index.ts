/**
 * AI Traffic Detection Module
 * 
 * Revolutionary methods for detecting "dark" AI traffic that
 * traditional analytics miss.
 * 
 * @module @loamly/tracker/detection
 */

export { detectNavigationType } from './navigation-timing'
export { detectAIFromReferrer, detectAIFromUTM } from './referrer'
export { 
  BehavioralClassifier, 
  createBehavioralClassifier,
  type BehavioralSignal,
  type BehavioralClassificationResult 
} from './behavioral-classifier'
