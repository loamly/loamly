/**
 * SPA Navigation Router
 * 
 * Detects client-side navigation in SPAs with support for:
 * - History API (pushState, replaceState, popstate)
 * - Hash changes (for hash-based routing)
 * - Next.js, React Router, Vue Router, etc.
 * 
 * @module @loamly/tracker
 */

export interface NavigationEvent {
  from_url: string
  to_url: string
  navigation_type: 'push' | 'replace' | 'pop' | 'hash' | 'initial'
  time_on_previous_page_ms: number
}

export interface RouterConfig {
  onNavigate?: (event: NavigationEvent) => void
  ignoreHashChange?: boolean
}

export class SPARouter {
  private config: RouterConfig
  private currentUrl: string
  private pageEnterTime: number
  private originalPushState: typeof history.pushState | null = null
  private originalReplaceState: typeof history.replaceState | null = null

  constructor(config: RouterConfig = {}) {
    this.config = config
    this.currentUrl = window.location.href
    this.pageEnterTime = Date.now()
  }

  /**
   * Start listening for navigation events
   */
  start(): void {
    // Patch History API
    this.patchHistoryAPI()

    // Listen for popstate (back/forward)
    window.addEventListener('popstate', this.handlePopState)

    // Listen for hash changes
    if (!this.config.ignoreHashChange) {
      window.addEventListener('hashchange', this.handleHashChange)
    }
  }

  /**
   * Stop listening and restore original methods
   */
  stop(): void {
    // Restore original History API methods
    if (this.originalPushState) {
      history.pushState = this.originalPushState
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState
    }

    window.removeEventListener('popstate', this.handlePopState)
    window.removeEventListener('hashchange', this.handleHashChange)
  }

  /**
   * Manually trigger a navigation event (for custom routers)
   */
  navigate(url: string, type: NavigationEvent['navigation_type'] = 'push'): void {
    this.emitNavigation(url, type)
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.currentUrl
  }

  /**
   * Get time on current page
   */
  getTimeOnPage(): number {
    return Date.now() - this.pageEnterTime
  }

  private patchHistoryAPI(): void {
    // Store original methods
    this.originalPushState = history.pushState.bind(history)
    this.originalReplaceState = history.replaceState.bind(history)

    // Patch pushState
    history.pushState = (...args) => {
      const result = this.originalPushState!(...args)
      this.handleStateChange('push')
      return result
    }

    // Patch replaceState
    history.replaceState = (...args) => {
      const result = this.originalReplaceState!(...args)
      this.handleStateChange('replace')
      return result
    }
  }

  private handleStateChange = (type: 'push' | 'replace'): void => {
    const newUrl = window.location.href
    if (newUrl !== this.currentUrl) {
      this.emitNavigation(newUrl, type)
    }
  }

  private handlePopState = (): void => {
    const newUrl = window.location.href
    if (newUrl !== this.currentUrl) {
      this.emitNavigation(newUrl, 'pop')
    }
  }

  private handleHashChange = (): void => {
    const newUrl = window.location.href
    if (newUrl !== this.currentUrl) {
      this.emitNavigation(newUrl, 'hash')
    }
  }

  private emitNavigation(toUrl: string, type: NavigationEvent['navigation_type']): void {
    const event: NavigationEvent = {
      from_url: this.currentUrl,
      to_url: toUrl,
      navigation_type: type,
      time_on_previous_page_ms: Date.now() - this.pageEnterTime,
    }

    // Update current state
    this.currentUrl = toUrl
    this.pageEnterTime = Date.now()

    // Emit event
    this.config.onNavigate?.(event)
  }
}

