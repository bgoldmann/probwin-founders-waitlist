'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

interface RecaptchaProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

export interface RecaptchaRef {
  reset: () => void
  execute: () => void
}

export const Recaptcha = forwardRef<RecaptchaRef, RecaptchaProps>(({
  onVerify,
  onError,
  onExpire
}, ref) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useImperativeHandle(ref, () => ({
    reset: () => {
      recaptchaRef.current?.reset()
    },
    execute: () => {
      recaptchaRef.current?.execute()
    }
  }))

  // Effect for development mode
  useEffect(() => {
    if (!siteKey || siteKey === 'placeholder_site_key') {
      console.warn('reCAPTCHA not configured - using mock token')
      onVerify('mock-recaptcha-token-development')
    }
  }, [siteKey, onVerify])

  if (!siteKey || siteKey === 'placeholder_site_key') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
        <p className="font-medium">Development Mode</p>
        <p className="text-xs mt-1">reCAPTCHA verification bypassed</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={(token) => token && onVerify(token)}
        onError={onError}
        onExpired={onExpire}
        theme="light"
        size="normal"
      />
    </div>
  )
})

Recaptcha.displayName = 'Recaptcha'