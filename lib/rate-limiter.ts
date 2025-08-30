import { NextRequest } from 'next/server'

/**
 * In-memory rate limiter for development/small scale
 * For production, consider using Redis or Upstash
 */
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout
  
  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      this.requests.forEach((data, key) => {
        if (now > data.resetTime) {
          this.requests.delete(key)
        }
      })
    }, 5 * 60 * 1000)
  }
  
  /**
   * Check if request is allowed
   * @param identifier - Usually IP address or user ID
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(identifier: string, limit: number, windowMs: number) {
    const now = Date.now()
    const resetTime = now + windowMs
    
    const current = this.requests.get(identifier)
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      this.requests.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
        retryAfter: 0,
      }
    }
    
    if (current.count < limit) {
      // Within limit
      current.count++
      return {
        allowed: true,
        remaining: limit - current.count,
        resetTime: current.resetTime,
        retryAfter: 0,
      }
    }
    
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    }
  }
  
  destroy() {
    clearInterval(this.cleanupInterval)
    this.requests.clear()
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter()

/**
 * Rate limiting configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Waitlist application submission - very strict
  WAITLIST_APPLY: { limit: 3, windowMs: 15 * 60 * 1000 }, // 3 requests per 15 minutes
  
  // Free signup - moderate
  FREE_SIGNUP: { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  
  // Seat availability check - generous for real-time updates
  SEATS_CHECK: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  
  // Stripe checkout creation - strict
  STRIPE_CHECKOUT: { limit: 5, windowMs: 10 * 60 * 1000 }, // 5 requests per 10 minutes
  
  // General API - moderate
  API_GENERAL: { limit: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  
  // Admin endpoints - very strict
  ADMIN: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
} as const

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS,
  customIdentifier?: string
) {
  const config = RATE_LIMITS[limitType]
  const identifier = customIdentifier || getClientIdentifier(request)
  
  return rateLimiter.check(identifier, config.limit, config.windowMs)
}

/**
 * Get client identifier for rate limiting
 * Uses combination of IP and user agent for better accuracy
 */
function getClientIdentifier(request: NextRequest): string {
  const ip = request.ip || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Create a simple hash of IP + first part of user agent
  const userAgentPrefix = userAgent.split(' ')[0] || 'unknown'
  return `${ip}:${userAgentPrefix}`
}

/**
 * Rate limiting middleware helper
 */
export async function withRateLimit<T>(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS,
  handler: () => Promise<T>,
  customIdentifier?: string
): Promise<T | Response> {
  const result = applyRateLimit(request, limitType, customIdentifier)
  
  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': result.retryAfter.toString(),
          'X-RateLimit-Limit': RATE_LIMITS[limitType].limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
        },
      }
    )
    
    return response
  }
  
  // Execute the handler
  const handlerResult = await handler()
  
  // Add rate limit headers to successful responses
  if (handlerResult instanceof Response) {
    handlerResult.headers.set('X-RateLimit-Limit', RATE_LIMITS[limitType].limit.toString())
    handlerResult.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    handlerResult.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
  }
  
  return handlerResult
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStatus(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS,
  customIdentifier?: string
) {
  const config = RATE_LIMITS[limitType]
  const identifier = customIdentifier || getClientIdentifier(request)
  
  // This doesn't consume a request, just checks status
  const current = (rateLimiter as any).requests.get(identifier)
  const now = Date.now()
  
  if (!current || now > current.resetTime) {
    return {
      remaining: config.limit,
      resetTime: now + config.windowMs,
      limited: false,
    }
  }
  
  return {
    remaining: Math.max(0, config.limit - current.count),
    resetTime: current.resetTime,
    limited: current.count >= config.limit,
  }
}

/**
 * Clear rate limit for a specific identifier (admin use)
 */
export function clearRateLimit(identifier: string) {
  (rateLimiter as any).requests.delete(identifier)
}

/**
 * Get all rate limit entries (for monitoring)
 */
export function getAllRateLimitEntries() {
  const entries: Array<{ identifier: string; count: number; resetTime: string }> = []
  ;(rateLimiter as any).requests.forEach((value: any, key: string) => {
    entries.push({
      identifier: key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
    })
  })
  return entries
}