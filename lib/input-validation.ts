import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

/**
 * Comprehensive input validation and sanitization
 * Based on security audit recommendations
 */

// Common validation patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  NAME: /^[a-zA-Z\s'-]{2,100}$/,
  COUNTRY_CODE: /^[A-Z]{2}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  // Use DOMPurify to sanitize
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  })
  
  // Additional sanitization - remove any remaining suspicious patterns
  return sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '')   // Remove vbscript: protocol
    .replace(/data:/gi, '')       // Remove data: protocol (potential XSS)
    .replace(/on\w+=/gi, '')      // Remove event handlers
    .trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

/**
 * Validate and sanitize waitlist application data
 */
export const WaitlistApplicationSchema = z.object({
  tier: z.enum(['99', '199'], {
    errorMap: () => ({ message: 'Invalid tier. Must be either 99 or 199.' })
  }),
  
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(VALIDATION_PATTERNS.NAME, 'Name contains invalid characters')
    .transform(sanitizeString),
    
  email: z
    .string()
    .max(254, 'Email must not exceed 254 characters')
    .regex(VALIDATION_PATTERNS.EMAIL, 'Invalid email format')
    .transform(str => sanitizeString(str).toLowerCase()),
    
  phone: z
    .string()
    .regex(VALIDATION_PATTERNS.PHONE, 'Invalid phone number format')
    .transform(sanitizeString)
    .optional(),
    
  country: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .regex(VALIDATION_PATTERNS.COUNTRY_CODE, 'Invalid country code format')
    .transform(str => sanitizeString(str).toUpperCase())
    .optional(),
    
  bankroll_range: z
    .enum(['under-1k', '1k-5k', '5k-10k', '10k-25k', '25k-plus'], {
      errorMap: () => ({ message: 'Invalid bankroll range' })
    })
    .transform(sanitizeString),
    
  sportsbooks: z
    .string()
    .min(3, 'Please specify your sportsbooks')
    .max(200, 'Sportsbooks list too long')
    .transform(sanitizeString),
    
  time_commitment: z
    .enum(['5-10min', '10-30min', '30-60min', '60min-plus'], {
      errorMap: () => ({ message: 'Invalid time commitment' })
    })
    .transform(sanitizeString),
    
  risk_profile: z
    .enum(['conservative', 'moderate', 'aggressive'], {
      errorMap: () => ({ message: 'Invalid risk profile' })
    })
    .transform(sanitizeString),
    
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .transform(sanitizeString)
    .optional(),
    
  eligibility_agreed: z
    .boolean()
    .refine(val => val === true, 'You must agree to the eligibility requirements'),
    
  recaptcha_token: z
    .string()
    .min(20, 'Invalid captcha token')
    .transform(sanitizeString),
})

/**
 * Validate free waitlist signup
 */
export const FreeWaitlistSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(VALIDATION_PATTERNS.NAME, 'Name contains invalid characters')
    .transform(sanitizeString),
    
  email: z
    .string()
    .max(254, 'Email must not exceed 254 characters')
    .regex(VALIDATION_PATTERNS.EMAIL, 'Invalid email format')
    .transform(str => sanitizeString(str).toLowerCase()),
    
  country: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .regex(VALIDATION_PATTERNS.COUNTRY_CODE, 'Invalid country code format')
    .transform(str => sanitizeString(str).toUpperCase())
    .optional(),
    
  utm_source: z
    .string()
    .max(50)
    .transform(sanitizeString)
    .optional(),
    
  utm_medium: z
    .string()
    .max(50)
    .transform(sanitizeString)
    .optional(),
    
  utm_campaign: z
    .string()
    .max(50)
    .transform(sanitizeString)
    .optional(),
})

/**
 * Validate UUID format
 */
export const UUIDSchema = z
  .string()
  .regex(VALIDATION_PATTERNS.UUID, 'Invalid UUID format')
  .transform(sanitizeString)

/**
 * Validate email format
 */
export const EmailSchema = z
  .string()
  .regex(VALIDATION_PATTERNS.EMAIL, 'Invalid email format')
  .transform(str => sanitizeString(str).toLowerCase())

/**
 * Validate and sanitize search parameters
 */
export function validateSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const sanitized: Record<string, string> = {}
  
  // Allow only specific parameters
  const allowedParams = [
    'utm_source',
    'utm_medium', 
    'utm_campaign',
    'ref',
    'session_id',
  ]
  
  searchParams.forEach((value, key) => {
    if (allowedParams.includes(key)) {
      sanitized[key] = sanitizeString(value)
    }
  })
  
  return sanitized
}

/**
 * Validate request headers for security
 */
export function validateHeaders(headers: Headers): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  const contentType = headers.get('content-type')
  if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
    issues.push('Invalid content type')
  }
  
  const userAgent = headers.get('user-agent')
  if (!userAgent || userAgent.length < 10) {
    issues.push('Suspicious or missing user agent')
  }
  
  // Check for suspicious patterns in headers
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /union.*select/i,
  ]
  
  headers.forEach((value, name) => {
    if (suspiciousPatterns.some(pattern => pattern.test(value))) {
      issues.push(`Suspicious content in ${name} header`)
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * SQL injection detection
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i,
    /drop.*table/i,
    /exec.*xp_/i,
    /'\s*;\s*drop/i,
    /'\s*or\s*'1'\s*=\s*'1/i,
    /'\s*or\s*1\s*=\s*1/i,
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * XSS detection
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /<img[^>]+src[^>]*>/i,
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * Comprehensive input security check
 */
export function securityCheckInput(input: string): {
  isSafe: boolean
  threats: string[]
} {
  const threats: string[] = []
  
  if (detectSQLInjection(input)) {
    threats.push('SQL Injection')
  }
  
  if (detectXSS(input)) {
    threats.push('XSS')
  }
  
  // Path traversal detection
  if (input.includes('../') || input.includes('..\\')) {
    threats.push('Path Traversal')
  }
  
  // Command injection detection
  const commandPatterns = [
    /;\s*rm\s/i,
    /;\s*cat\s/i,
    /;\s*ls\s/i,
    /;\s*wget\s/i,
    /;\s*curl\s/i,
    /\|\s*nc\s/i,
  ]
  
  if (commandPatterns.some(pattern => pattern.test(input))) {
    threats.push('Command Injection')
  }
  
  return {
    isSafe: threats.length === 0,
    threats,
  }
}