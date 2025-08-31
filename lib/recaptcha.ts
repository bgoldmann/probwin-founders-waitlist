import { z } from 'zod'
import { env } from './env'

/**
 * Google reCAPTCHA v2 verification service
 * Provides server-side verification of reCAPTCHA tokens
 */

// Response schema from Google reCAPTCHA API
const recaptchaResponseSchema = z.object({
  success: z.boolean(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
})

export type RecaptchaResponse = z.infer<typeof recaptchaResponseSchema>

/**
 * Error codes from Google reCAPTCHA
 */
export const RECAPTCHA_ERROR_CODES = {
  'missing-input-secret': 'The secret parameter is missing',
  'invalid-input-secret': 'The secret parameter is invalid or malformed',
  'missing-input-response': 'The response parameter is missing',
  'invalid-input-response': 'The response parameter is invalid or malformed',
  'bad-request': 'The request is invalid or malformed',
  'timeout-or-duplicate': 'The response is no longer valid: either is too old or has been used previously',
} as const

/**
 * reCAPTCHA verification result
 */
export interface RecaptchaVerificationResult {
  success: boolean
  errorCodes?: string[]
  timestamp?: string
  hostname?: string
  errorMessage?: string
}

/**
 * Google reCAPTCHA verification service
 */
export class RecaptchaVerifier {
  private static readonly VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
  
  /**
   * Verify a reCAPTCHA token
   */
  static async verify(
    token: string,
    remoteIP?: string
  ): Promise<RecaptchaVerificationResult> {
    try {
      // In development with placeholder key, bypass verification
      const secretKey = process.env.RECAPTCHA_SECRET_KEY
      if (!secretKey || secretKey === 'placeholder_secret_key') {
        console.warn('reCAPTCHA verification bypassed in development')
        return {
          success: true,
          timestamp: new Date().toISOString(),
          hostname: 'localhost',
        }
      }
      
      // Build verification request
      const params = new URLSearchParams({
        secret: secretKey,
        response: token,
      })
      
      if (remoteIP && remoteIP !== 'unknown') {
        params.append('remoteip', remoteIP)
      }
      
      // Send verification request to Google
      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
      
      if (!response.ok) {
        throw new Error(`reCAPTCHA API error: ${response.status}`)
      }
      
      const data = await response.json()
      const result = recaptchaResponseSchema.parse(data)
      
      return {
        success: result.success,
        errorCodes: result['error-codes'],
        timestamp: result.challenge_ts,
        hostname: result.hostname,
        errorMessage: result['error-codes']
          ?.map(code => RECAPTCHA_ERROR_CODES[code as keyof typeof RECAPTCHA_ERROR_CODES] || code)
          .join(', '),
      }
      
    } catch (error) {
      console.error('reCAPTCHA verification error:', error)
      
      return {
        success: false,
        errorCodes: ['verification-error'],
        errorMessage: error instanceof Error ? error.message : 'Verification failed',
      }
    }
  }
  
  /**
   * Validate reCAPTCHA configuration
   */
  static validateConfiguration(): {
    hasSecretKey: boolean
    hasSiteKey: boolean
    isConfigured: boolean
  } {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    
    return {
      hasSecretKey: !!secretKey && secretKey !== 'placeholder_secret_key',
      hasSiteKey: !!siteKey && siteKey !== 'placeholder_site_key',
      isConfigured: !!secretKey && !!siteKey && 
                   secretKey !== 'placeholder_secret_key' && 
                   siteKey !== 'placeholder_site_key',
    }
  }
  
  /**
   * Test reCAPTCHA configuration (development only)
   */
  static async testConfiguration(): Promise<{
    configValid: boolean
    apiReachable: boolean
    error?: string
  }> {
    try {
      const config = this.validateConfiguration()
      
      if (!config.hasSecretKey) {
        return {
          configValid: false,
          apiReachable: false,
          error: 'Missing secret key',
        }
      }
      
      // Test API connectivity with a known invalid token
      const result = await this.verify('test-invalid-token')
      
      // We expect this to fail, but it should fail with proper error codes
      return {
        configValid: config.isConfigured,
        apiReachable: true,
        error: result.errorMessage,
      }
      
    } catch (error) {
      return {
        configValid: false,
        apiReachable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Client-side reCAPTCHA helper
 */
export const getRecaptchaSiteKey = (): string | undefined => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  return siteKey && siteKey !== 'placeholder_site_key' ? siteKey : undefined
}