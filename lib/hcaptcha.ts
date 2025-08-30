import { getEnv } from './env'

/**
 * hCaptcha integration for bot protection
 * Based on security audit recommendations
 */

interface HCaptchaVerifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  credit?: boolean
  'error-codes'?: string[]
  score?: number
  score_reason?: string[]
}

export class HCaptchaVerifier {
  private static readonly VERIFY_URL = 'https://hcaptcha.com/siteverify'
  private static readonly TIMEOUT = 10000 // 10 seconds
  private static readonly MIN_SCORE = 0.5 // Minimum score to pass (if scoring is enabled)

  /**
   * Verify hCaptcha token with comprehensive validation
   */
  static async verify(
    token: string,
    remoteip?: string,
    sitekey?: string
  ): Promise<{
    success: boolean
    score?: number
    errorCodes?: string[]
    riskReason?: string
  }> {
    try {
      // Basic token validation
      if (!token || token.length < 100) {
        return {
          success: false,
          errorCodes: ['invalid-token'],
          riskReason: 'Token too short or empty',
        }
      }

      // Prepare request body
      const params = new URLSearchParams({
        secret: getEnv('HCAPTCHA_SECRET_KEY'),
        response: token,
      })

      if (remoteip) {
        params.append('remoteip', remoteip)
      }

      if (sitekey) {
        params.append('sitekey', sitekey)
      }

      // Make verification request with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)

      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result: HCaptchaVerifyResponse = await response.json()

      // Log verification attempt for security monitoring
      await this.logVerificationAttempt(token, result, remoteip)

      // Check basic success
      if (!result.success) {
        return {
          success: false,
          errorCodes: result['error-codes'] || ['verification-failed'],
          riskReason: this.getErrorMessage(result['error-codes']),
        }
      }

      // Additional security checks
      const securityCheck = this.performSecurityChecks(result, remoteip)
      if (!securityCheck.passed) {
        return {
          success: false,
          errorCodes: ['security-check-failed'],
          riskReason: securityCheck.reason,
        }
      }

      return {
        success: true,
        score: result.score,
      }

    } catch (error) {
      console.error('hCaptcha verification error:', error)
      
      // Log verification error
      await this.logVerificationError(token, error, remoteip)

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          errorCodes: ['timeout'],
          riskReason: 'Verification timeout',
        }
      }

      return {
        success: false,
        errorCodes: ['network-error'],
        riskReason: 'Network error during verification',
      }
    }
  }

  /**
   * Perform additional security checks on verification result
   */
  private static performSecurityChecks(
    result: HCaptchaVerifyResponse,
    remoteip?: string
  ): { passed: boolean; reason?: string } {
    // Check timestamp freshness (within 2 minutes)
    if (result.challenge_ts) {
      const challengeTime = new Date(result.challenge_ts).getTime()
      const now = Date.now()
      const maxAge = 2 * 60 * 1000 // 2 minutes

      if (now - challengeTime > maxAge) {
        return {
          passed: false,
          reason: 'Challenge timestamp too old',
        }
      }
    }

    // Check hostname if provided (should match our domain)
    if (result.hostname) {
      const allowedHostnames = [
        'probwin.ai',
        'www.probwin.ai',
        'localhost', // For development
      ]

      if (!allowedHostnames.includes(result.hostname)) {
        return {
          passed: false,
          reason: `Invalid hostname: ${result.hostname}`,
        }
      }
    }

    // Check score if available
    if (result.score !== undefined && result.score < this.MIN_SCORE) {
      return {
        passed: false,
        reason: `Score too low: ${result.score}`,
      }
    }

    return { passed: true }
  }

  /**
   * Get human-readable error message
   */
  private static getErrorMessage(errorCodes?: string[]): string {
    if (!errorCodes || errorCodes.length === 0) {
      return 'Unknown verification error'
    }

    const errorMessages: Record<string, string> = {
      'missing-input-secret': 'Missing secret key',
      'invalid-input-secret': 'Invalid secret key',
      'missing-input-response': 'Missing captcha response',
      'invalid-input-response': 'Invalid captcha response',
      'bad-request': 'Bad request format',
      'invalid-or-already-seen-response': 'Captcha already used',
      'not-using-dummy-passcode': 'Invalid test passcode',
      'sitekey-secret-mismatch': 'Sitekey and secret mismatch',
    }

    return errorCodes
      .map(code => errorMessages[code] || code)
      .join(', ')
  }

  /**
   * Log verification attempt for security monitoring
   */
  private static async logVerificationAttempt(
    token: string,
    result: HCaptchaVerifyResponse,
    remoteip?: string
  ): Promise<void> {
    try {
      const { DatabaseOperations } = await import('./database')
      
      await DatabaseOperations.logSecurityEvent(
        'hcaptcha_verification',
        result.success ? 'low' : 'medium',
        {
          ip_address: remoteip,
          event_data: {
            success: result.success,
            error_codes: result['error-codes'],
            score: result.score,
            hostname: result.hostname,
            challenge_ts: result.challenge_ts,
          }
        }
      )
    } catch (error) {
      console.error('Failed to log hCaptcha verification:', error)
      // Don't throw - logging failures shouldn't break verification
    }
  }

  /**
   * Log verification error for security monitoring
   */
  private static async logVerificationError(
    token: string,
    error: unknown,
    remoteip?: string
  ): Promise<void> {
    try {
      const { DatabaseOperations } = await import('./database')
      
      await DatabaseOperations.logSecurityEvent(
        'hcaptcha_verification_error',
        'high',
        {
          ip_address: remoteip,
          event_data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            token_length: token?.length || 0,
          }
        }
      )
    } catch (logError) {
      console.error('Failed to log hCaptcha error:', logError)
      // Don't throw - logging failures shouldn't break verification
    }
  }

  /**
   * Validate hCaptcha configuration
   */
  static validateConfiguration(): {
    valid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    try {
      const secretKey = getEnv('HCAPTCHA_SECRET_KEY')
      if (!secretKey || secretKey.length < 30) {
        issues.push('Invalid or missing HCAPTCHA_SECRET_KEY')
      }
    } catch {
      issues.push('HCAPTCHA_SECRET_KEY not configured')
    }

    try {
      const siteKey = getEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY')
      if (!siteKey || siteKey.length < 30) {
        issues.push('Invalid or missing NEXT_PUBLIC_HCAPTCHA_SITE_KEY')
      }
    } catch {
      issues.push('NEXT_PUBLIC_HCAPTCHA_SITE_KEY not configured')
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  /**
   * Test hCaptcha configuration (development only)
   */
  static async testConfiguration(): Promise<{
    success: boolean
    message: string
  }> {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        message: 'Configuration testing not available in production',
      }
    }

    const configCheck = this.validateConfiguration()
    if (!configCheck.valid) {
      return {
        success: false,
        message: `Configuration issues: ${configCheck.issues.join(', ')}`,
      }
    }

    // Test with a dummy token (will fail but confirms API connectivity)
    try {
      const result = await this.verify('test-token')
      return {
        success: true,
        message: 'hCaptcha API is reachable (test verification failed as expected)',
      }
    } catch (error) {
      return {
        success: false,
        message: `API connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
}

/**
 * Client-side hCaptcha utilities
 */
export const HCaptchaUtils = {
  /**
   * Get hCaptcha site key for client-side usage
   */
  getSiteKey(): string {
    if (typeof window === 'undefined') {
      throw new Error('getSiteKey() can only be called client-side')
    }
    
    return process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''
  },

  /**
   * Check if hCaptcha is properly configured
   */
  isConfigured(): boolean {
    if (typeof window === 'undefined') {
      return false
    }
    
    const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    return !!(siteKey && siteKey.length > 30)
  },

  /**
   * Reset hCaptcha widget (if using React component)
   */
  reset(captchaRef?: any): void {
    if (captchaRef?.current?.resetCaptcha) {
      captchaRef.current.resetCaptcha()
    }
  },

  /**
   * Execute hCaptcha widget (if using React component)
   */
  execute(captchaRef?: any): void {
    if (captchaRef?.current?.execute) {
      captchaRef.current.execute()
    }
  },
}