'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { HCaptchaUtils } from '../../lib/hcaptcha'

interface HCaptchaProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error: string) => void
  theme?: 'light' | 'dark'
  size?: 'normal' | 'compact'
  className?: string
}

export interface HCaptchaRef {
  execute: () => void
  reset: () => void
  getResponse: () => string | null
}

/**
 * hCaptcha component with proper error handling and accessibility
 */
export const HCaptcha = forwardRef<HCaptchaRef, HCaptchaProps>(({
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  size = 'normal',
  className = '',
}, ref) => {
  const captchaRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    execute: () => {
      if (window.hcaptcha && widgetId.current) {
        window.hcaptcha.execute(widgetId.current)
      }
    },
    reset: () => {
      if (window.hcaptcha && widgetId.current) {
        window.hcaptcha.reset(widgetId.current)
      }
    },
    getResponse: () => {
      if (window.hcaptcha && widgetId.current) {
        return window.hcaptcha.getResponse(widgetId.current)
      }
      return null
    },
  }))

  useEffect(() => {
    // Check if hCaptcha is configured
    if (!HCaptchaUtils.isConfigured()) {
      onError?.('hCaptcha not properly configured')
      return
    }

    // Load hCaptcha script if not already loaded
    const loadHCaptcha = () => {
      if (window.hcaptcha) {
        renderCaptcha()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://js.hcaptcha.com/1/api.js'
      script.async = true
      script.defer = true
      
      script.onload = () => {
        if (window.hcaptcha) {
          renderCaptcha()
        } else {
          onError?.('Failed to load hCaptcha')
        }
      }
      
      script.onerror = () => {
        onError?.('Failed to load hCaptcha script')
      }

      document.head.appendChild(script)
    }

    const renderCaptcha = () => {
      if (!containerRef.current || widgetId.current) {
        return
      }

      try {
        widgetId.current = window.hcaptcha.render(containerRef.current, {
          sitekey: HCaptchaUtils.getSiteKey(),
          theme,
          size,
          callback: (token: string) => {
            onVerify(token)
          },
          'expired-callback': () => {
            onExpire?.()
          },
          'error-callback': (error: string) => {
            onError?.(error)
          },
          'chalexpired-callback': () => {
            onError?.('Challenge expired')
          },
          'open-callback': () => {
            // Challenge opened - can be used for analytics
          },
          'close-callback': () => {
            // Challenge closed - can be used for analytics
          },
        })
      } catch (error) {
        onError?.(`Render error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    loadHCaptcha()

    // Cleanup function
    return () => {
      if (window.hcaptcha && widgetId.current) {
        try {
          window.hcaptcha.remove(widgetId.current)
        } catch (error) {
          console.warn('Error removing hCaptcha widget:', error)
        }
      }
    }
  }, [onVerify, onExpire, onError, theme, size])

  return (
    <div className={`hcaptcha-container ${className}`}>
      <div
        ref={containerRef}
        className="hcaptcha-widget"
        aria-label="hCaptcha challenge"
      />
      <noscript>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 text-sm">
          Please enable JavaScript to complete the security verification.
        </div>
      </noscript>
    </div>
  )
})

HCaptcha.displayName = 'HCaptcha'

/**
 * Global hCaptcha type definitions
 */
declare global {
  interface Window {
    hcaptcha: {
      render: (container: Element, params: any) => string
      reset: (widgetId: string) => void
      execute: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}