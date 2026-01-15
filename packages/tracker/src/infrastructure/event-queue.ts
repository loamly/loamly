/**
 * Event Queue with Batching, Retry & Persistence
 * 
 * Production-grade event delivery with:
 * - Batch processing for network efficiency
 * - Retry with exponential backoff
 * - localStorage persistence for offline support
 * - sendBeacon fallback for unload events
 * 
 * @module @loamly/tracker
 */

import { DEFAULT_CONFIG } from '../config'

export interface QueuedEvent {
  id: string
  type: string
  payload: Record<string, unknown>
  headers?: Record<string, string>
  timestamp: number
  retries: number
}

interface EventQueueConfig {
  batchSize: number
  batchTimeout: number
  maxRetries: number
  retryDelayMs: number
  storageKey: string
  apiKey?: string
}

const DEFAULT_QUEUE_CONFIG: EventQueueConfig = {
  batchSize: DEFAULT_CONFIG.batchSize,
  batchTimeout: DEFAULT_CONFIG.batchTimeout,
  maxRetries: 3,
  retryDelayMs: 1000,
  storageKey: '_loamly_queue',
}

export class EventQueue {
  private queue: QueuedEvent[] = []
  private batchTimer: ReturnType<typeof setTimeout> | null = null
  private config: EventQueueConfig
  private endpoint: string
  private isFlushing = false

  constructor(endpoint: string, config: Partial<EventQueueConfig> = {}) {
    this.endpoint = endpoint
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config }
    this.loadFromStorage()
  }

  /**
   * Add event to queue
   */
  push(type: string, payload: Record<string, unknown>, headers?: Record<string, string>): void {
    const event: QueuedEvent = {
      id: this.generateId(),
      type,
      payload,
      headers,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(event)
    this.saveToStorage()
    this.scheduleBatch()
  }

  /**
   * Force flush all events immediately
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return

    this.isFlushing = true
    this.clearBatchTimer()

    try {
      const events = [...this.queue]
      this.queue = []
      
      await this.sendBatch(events)
    } finally {
      this.isFlushing = false
      this.saveToStorage()
    }
  }

  /**
   * Flush using sendBeacon (for unload events)
   */
  flushBeacon(): boolean {
    if (this.queue.length === 0) return true

    const baseUrl = this.config.apiKey
      ? `${this.endpoint}?api_key=${encodeURIComponent(this.config.apiKey)}`
      : this.endpoint

    let allSent = true
    for (const event of this.queue) {
      const payload = {
        ...event.payload,
        _queue_id: event.id,
        _queue_timestamp: event.timestamp,
      }

      const success = navigator.sendBeacon?.(baseUrl, JSON.stringify(payload)) ?? false
      if (!success) {
        allSent = false
        break
      }
    }

    if (allSent) {
      this.queue = []
      this.clearStorage()
    }

    return allSent
  }

  /**
   * Get current queue length
   */
  get length(): number {
    return this.queue.length
  }

  private scheduleBatch(): void {
    if (this.batchTimer) return

    // Flush immediately if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      this.flush()
      return
    }

    // Schedule batch flush
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null
      this.flush()
    }, this.config.batchTimeout)
  }

  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }

  private async sendBatch(events: QueuedEvent[]): Promise<void> {
    if (events.length === 0) return

    try {
      const results = await Promise.allSettled(
        events.map(async (event) => {
          const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(event.headers || {}),
            },
            body: JSON.stringify({
              ...event.payload,
              _queue_id: event.id,
              _queue_timestamp: event.timestamp,
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
        })
      )

      const failedEvents = events.filter((_, index) => results[index]?.status === 'rejected')
      if (failedEvents.length > 0) {
        // Retry failed events only
        for (const event of failedEvents) {
          if (event.retries < this.config.maxRetries) {
            event.retries++
            this.queue.push(event)
          }
        }
        // Schedule retry with exponential backoff
        const delay = this.config.retryDelayMs * Math.pow(2, failedEvents[0].retries - 1)
        setTimeout(() => this.flush(), delay)
      }
      return
    } catch (error) {
      // Retry all events if we hit an unexpected error
      for (const event of events) {
        if (event.retries < this.config.maxRetries) {
          event.retries++
          this.queue.push(event)
        }
      }

      // Schedule retry with exponential backoff
      if (this.queue.length > 0) {
        const delay = this.config.retryDelayMs * Math.pow(2, events[0].retries - 1)
        setTimeout(() => this.flush(), delay)
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Only restore events less than 24 hours old
          const cutoff = Date.now() - 24 * 60 * 60 * 1000
          this.queue = parsed.filter((e: QueuedEvent) => e.timestamp > cutoff)
        }
      }
    } catch {
      // localStorage not available or corrupted
    }
  }

  private saveToStorage(): void {
    try {
      if (this.queue.length > 0) {
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.queue))
      } else {
        this.clearStorage()
      }
    } catch {
      // localStorage not available
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.config.storageKey)
    } catch {
      // Ignore
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

