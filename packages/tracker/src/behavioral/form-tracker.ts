/**
 * Universal Form Tracker
 * 
 * Comprehensive form tracking with support for:
 * - Native HTML forms
 * - HubSpot forms
 * - Typeform embeds
 * - JotForm embeds
 * - Gravity Forms
 * - Thank-you page detection
 * - Privacy-preserving field capture
 * 
 * @module @loamly/tracker
 */

export interface FormEvent {
  event_type: 'form_start' | 'form_field' | 'form_submit' | 'form_success'
  form_id: string
  form_type: 'native' | 'hubspot' | 'typeform' | 'jotform' | 'gravity' | 'unknown'
  field_name?: string
  field_type?: string
  time_to_submit_ms?: number
  is_conversion?: boolean
}

export interface FormTrackerConfig {
  // Privacy: Never capture these field values
  sensitiveFields: string[]
  // Fields to track interaction (not values)
  trackableFields: string[]
  // Patterns for thank-you page detection
  thankYouPatterns: RegExp[]
  // Callback for form events
  onFormEvent?: (event: FormEvent) => void
}

const DEFAULT_CONFIG: FormTrackerConfig = {
  sensitiveFields: [
    'password', 'pwd', 'pass',
    'credit', 'card', 'cvv', 'cvc',
    'ssn', 'social',
    'secret', 'token', 'key',
  ],
  trackableFields: [
    'email', 'name', 'phone', 'company',
    'first', 'last', 'city', 'country',
  ],
  thankYouPatterns: [
    /thank[-_]?you/i,
    /success/i,
    /confirmation/i,
    /submitted/i,
    /complete/i,
  ],
}

export class FormTracker {
  private config: FormTrackerConfig
  private formStartTimes = new Map<string, number>()
  private interactedForms = new Set<string>()
  private mutationObserver: MutationObserver | null = null

  constructor(config: Partial<FormTrackerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      sensitiveFields: [
        ...DEFAULT_CONFIG.sensitiveFields,
        ...(config.sensitiveFields || []),
      ],
    }
  }

  /**
   * Start tracking forms
   */
  start(): void {
    // Track native form interactions
    document.addEventListener('focusin', this.handleFocusIn, { passive: true })
    document.addEventListener('submit', this.handleSubmit)
    document.addEventListener('click', this.handleClick, { passive: true })

    // Observe DOM for dynamically added forms (HubSpot, Typeform, etc.)
    this.startMutationObserver()

    // Check for thank-you page on load
    this.checkThankYouPage()

    // Scan for existing embedded forms
    this.scanForEmbeddedForms()
  }

  /**
   * Stop tracking
   */
  stop(): void {
    document.removeEventListener('focusin', this.handleFocusIn)
    document.removeEventListener('submit', this.handleSubmit)
    document.removeEventListener('click', this.handleClick)
    this.mutationObserver?.disconnect()
  }

  /**
   * Get forms that had interaction
   */
  getInteractedForms(): string[] {
    return Array.from(this.interactedForms)
  }

  private handleFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement
    if (!this.isFormField(target)) return

    const form = target.closest('form')
    const formId = this.getFormId(form || target)

    // Track form start
    if (!this.formStartTimes.has(formId)) {
      this.formStartTimes.set(formId, Date.now())
      this.interactedForms.add(formId)
      
      this.emitEvent({
        event_type: 'form_start',
        form_id: formId,
        form_type: this.detectFormType(form || target),
      })
    }

    // Track field interaction (privacy-safe)
    const fieldName = this.getFieldName(target as HTMLInputElement)
    if (fieldName && !this.isSensitiveField(fieldName)) {
      this.emitEvent({
        event_type: 'form_field',
        form_id: formId,
        form_type: this.detectFormType(form || target),
        field_name: this.sanitizeFieldName(fieldName),
        field_type: (target as HTMLInputElement).type || target.tagName.toLowerCase(),
      })
    }
  }

  private handleSubmit = (e: Event): void => {
    const form = e.target as HTMLFormElement
    if (!form || form.tagName !== 'FORM') return

    const formId = this.getFormId(form)
    const startTime = this.formStartTimes.get(formId)

    this.emitEvent({
      event_type: 'form_submit',
      form_id: formId,
      form_type: this.detectFormType(form),
      time_to_submit_ms: startTime ? Date.now() - startTime : undefined,
      is_conversion: true,
    })
  }

  private handleClick = (e: Event): void => {
    const target = e.target as HTMLElement
    
    // Check for HubSpot submit button
    if (target.closest('.hs-button') || target.closest('[type="submit"]')) {
      const form = target.closest('form')
      if (form && form.classList.contains('hs-form')) {
        const formId = this.getFormId(form)
        const startTime = this.formStartTimes.get(formId)

        this.emitEvent({
          event_type: 'form_submit',
          form_id: formId,
          form_type: 'hubspot',
          time_to_submit_ms: startTime ? Date.now() - startTime : undefined,
          is_conversion: true,
        })
      }
    }

    // Check for Typeform submit
    if (target.closest('[data-qa="submit-button"]')) {
      this.emitEvent({
        event_type: 'form_submit',
        form_id: 'typeform_embed',
        form_type: 'typeform',
        is_conversion: true,
      })
    }
  }

  private startMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check for HubSpot form
            if (node.classList?.contains('hs-form') || node.querySelector?.('.hs-form')) {
              this.trackEmbeddedForm(node, 'hubspot')
            }
            // Check for Typeform
            if (node.classList?.contains('typeform-widget') || node.querySelector?.('[data-tf-widget]')) {
              this.trackEmbeddedForm(node, 'typeform')
            }
            // Check for JotForm
            if (node.classList?.contains('jotform-form') || node.querySelector?.('.jotform-form')) {
              this.trackEmbeddedForm(node, 'jotform')
            }
            // Check for Gravity Forms
            if (node.classList?.contains('gform_wrapper') || node.querySelector?.('.gform_wrapper')) {
              this.trackEmbeddedForm(node, 'gravity')
            }
          }
        }
      }
    })

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private scanForEmbeddedForms(): void {
    // HubSpot
    document.querySelectorAll('.hs-form').forEach(form => {
      this.trackEmbeddedForm(form as HTMLElement, 'hubspot')
    })
    
    // Typeform
    document.querySelectorAll('[data-tf-widget], .typeform-widget').forEach(form => {
      this.trackEmbeddedForm(form as HTMLElement, 'typeform')
    })
    
    // JotForm
    document.querySelectorAll('.jotform-form').forEach(form => {
      this.trackEmbeddedForm(form as HTMLElement, 'jotform')
    })
    
    // Gravity Forms
    document.querySelectorAll('.gform_wrapper').forEach(form => {
      this.trackEmbeddedForm(form as HTMLElement, 'gravity')
    })
  }

  private trackEmbeddedForm(element: HTMLElement, type: FormEvent['form_type']): void {
    const formId = `${type}_${this.getFormId(element)}`
    
    // Add event listeners for embedded form interactions
    element.addEventListener('focusin', () => {
      if (!this.formStartTimes.has(formId)) {
        this.formStartTimes.set(formId, Date.now())
        this.interactedForms.add(formId)
        
        this.emitEvent({
          event_type: 'form_start',
          form_id: formId,
          form_type: type,
        })
      }
    }, { passive: true })
  }

  private checkThankYouPage(): void {
    const url = window.location.href.toLowerCase()
    const title = document.title.toLowerCase()
    
    for (const pattern of this.config.thankYouPatterns) {
      if (pattern.test(url) || pattern.test(title)) {
        this.emitEvent({
          event_type: 'form_success',
          form_id: 'page_conversion',
          form_type: 'unknown',
          is_conversion: true,
        })
        break
      }
    }
  }

  private isFormField(element: HTMLElement): boolean {
    const tagName = element.tagName
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
  }

  private getFormId(element: HTMLElement | null): string {
    if (!element) return 'unknown'
    return element.id || element.getAttribute('name') || element.getAttribute('data-form-id') || 'form_' + Math.random().toString(36).substring(2, 8)
  }

  private getFieldName(input: HTMLInputElement): string {
    return input.name || input.id || input.getAttribute('data-name') || ''
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase()
    return this.config.sensitiveFields.some(sensitive => lowerName.includes(sensitive))
  }

  private sanitizeFieldName(fieldName: string): string {
    // Remove any potential PII from field names
    return fieldName.replace(/[0-9]+/g, '*').substring(0, 50)
  }

  private detectFormType(element: HTMLElement): FormEvent['form_type'] {
    if (element.classList.contains('hs-form') || element.closest('.hs-form')) {
      return 'hubspot'
    }
    if (element.classList.contains('typeform-widget') || element.closest('[data-tf-widget]')) {
      return 'typeform'
    }
    if (element.classList.contains('jotform-form') || element.closest('.jotform-form')) {
      return 'jotform'
    }
    if (element.classList.contains('gform_wrapper') || element.closest('.gform_wrapper')) {
      return 'gravity'
    }
    if (element.tagName === 'FORM') {
      return 'native'
    }
    return 'unknown'
  }

  private emitEvent(event: FormEvent): void {
    this.config.onFormEvent?.(event)
  }
}

