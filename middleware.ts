import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security middleware with comprehensive protections
 * Based on security audit recommendations from Research-Analysis.md
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Get request information
  const url = request.nextUrl.pathname
  const origin = request.headers.get('origin')
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.ip || 'unknown'
  
  // Security Headers for all requests
  const securityHeaders = {
    // Content Security Policy - Strict but functional for our use case
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://www.google.com https://*.supabase.co https://www.google-analytics.com",
      "frame-src 'self' https://js.stripe.com https://www.google.com https://www.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
    
    // Prevent DNS prefetch attacks
    'X-DNS-Prefetch-Control': 'on',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // MIME type sniffing protection
    'X-Content-Type-Options': 'nosniff',
    
    // Referrer policy for privacy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy to disable unnecessary browser APIs
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
    ].join(', '),
    
    // HSTS for production (will be overridden in production with longer duration)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    
    // Remove server information
    'Server': 'ProbWin.ai',
    
    // Cache control for sensitive pages
    'Cache-Control': url.includes('/api/') || url.includes('/admin/') 
      ? 'no-store, no-cache, must-revalidate, private'
      : 'public, max-age=0, must-revalidate',
  }
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Resource hints for performance and security
  if (url === '/' || url === '/waitlist') {
    response.headers.set(
      'Link',
      [
        '</fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous',
        '<https://api.stripe.com>; rel=preconnect',
        '<https://js.stripe.com>; rel=preconnect',
        '<https://www.google.com>; rel=preconnect',
      ].join(', ')
    )
  }
  
  // CORS handling for API routes
  if (url.startsWith('/api/')) {
    // Only allow specific origins in production
    const allowedOrigins = [
      'https://probwin.ai',
      'https://www.probwin.ai',
    ]
    
    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      )
    }
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    // API-specific headers
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }
  
  // Rate limiting headers for transparency
  if (url.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Window', '900') // 15 minutes
  }
  
  // Security monitoring - Log suspicious requests
  const suspiciousPatterns = [
    /\.\./,                    // Directory traversal
    /<script/i,                // XSS attempts
    /union.*select/i,          // SQL injection attempts
    /javascript:/i,            // JavaScript protocol
    /vbscript:/i,             // VBScript protocol
    /data:/i,                 // Data URLs (potential XSS)
    /\.php$/i,                // PHP file requests
    /\.asp$/i,                // ASP file requests
    /wp-admin/i,              // WordPress admin attempts
    /admin\.php/i,            // Admin PHP attempts
  ]
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || 
    pattern.test(userAgent) ||
    (request.nextUrl.search && pattern.test(request.nextUrl.search))
  )
  
  if (isSuspicious) {
    console.warn(`Suspicious request detected: ${ip} ${userAgent} ${url}`)
    
    // Log to security system (async, non-blocking)
    logSecurityEvent('suspicious_request', {
      ip,
      userAgent,
      url,
      timestamp: new Date().toISOString(),
    }).catch(console.error)
    
    // Return 403 for obviously malicious requests
    if (url.includes('..') || url.includes('<script')) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  
  // Bot detection (basic patterns)
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /php/i,
  ]
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent))
  if (isBot && !url.startsWith('/api/') && !url.includes('sitemap')) {
    // Allow bots for SEO but add identification
    response.headers.set('X-Detected-Bot', 'true')
  }
  
  // Additional security for admin routes (when implemented)
  if (url.startsWith('/admin/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }
  
  // Development security warnings
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Development-Mode', 'true')
  }
  
  return response
}

/**
 * Async security event logging (non-blocking)
 */
async function logSecurityEvent(eventType: string, data: any): Promise<void> {
  try {
    // Import here to avoid circular dependencies
    const { DatabaseOperations } = await import('./lib/database')
    
    await DatabaseOperations.logSecurityEvent(
      eventType,
      'medium',
      {
        ip_address: data.ip,
        user_agent: data.userAgent,
        event_data: {
          url: data.url,
          timestamp: data.timestamp,
        }
      }
    )
  } catch (error) {
    console.error('Failed to log security event:', error)
    // Don't throw - logging failures shouldn't break requests
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}