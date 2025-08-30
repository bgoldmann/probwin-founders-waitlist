/**
 * API Security Middleware for ProbWin.ai
 * Provides comprehensive API protection including authentication, authorization,
 * rate limiting, and request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { 
  SecurityRateLimit, 
  SecurityValidator, 
  SecurityHeaders, 
  SecurityAudit,
  SecurityAuth,
  schemas 
} from '@/lib/security';

// ===== TYPES =====

export interface ApiContext {
  request: NextRequest;
  ip: string;
  userAgent: string;
  user?: any;
  admin?: boolean;
}

export interface SecurityConfig {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: 'strict' | 'moderate' | 'lenient';
  schema?: any;
  requireCSRF?: boolean;
}

// ===== AUTHENTICATION =====

export class ApiAuthentication {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  private static supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  private static adminSecret = process.env.ADMIN_SECRET_KEY!;

  /**
   * Authenticate user via Supabase JWT
   */
  static async authenticateUser(request: NextRequest): Promise<any | null> {
    try {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return null;
      }

      const supabase = createClient(
        this.supabaseUrl,
        this.supabaseServiceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        SecurityAudit.logSecurityEvent({
          type: 'auth_failure',
          ip: this.getClientIP(request),
          details: `Authentication failed: ${error?.message || 'Invalid token'}`,
          severity: 'medium'
        });
        return null;
      }

      return user;
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'auth_failure',
        ip: this.getClientIP(request),
        details: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return null;
    }
  }

  /**
   * Authenticate admin via secret key
   */
  static async authenticateAdmin(request: NextRequest): Promise<boolean> {
    try {
      const adminToken = request.headers.get('x-admin-token');
      
      if (!adminToken) {
        return false;
      }

      const isValid = SecurityAuth.validateAdminToken(adminToken, this.adminSecret);

      if (!isValid) {
        SecurityAudit.logSecurityEvent({
          type: 'auth_failure',
          ip: this.getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
          details: 'Invalid admin token provided',
          severity: 'high'
        });
      }

      return isValid;
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'auth_failure',
        ip: this.getClientIP(request),
        details: `Admin authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      });
      return false;
    }
  }

  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }
}

// ===== CSRF PROTECTION =====

export class CSRFProtection {
  /**
   * Validate CSRF token for state-changing operations
   */
  static validateCSRFToken(request: NextRequest): boolean {
    try {
      const csrfTokenHeader = request.headers.get('x-csrf-token');
      const csrfTokenCookie = request.cookies.get('csrf-token')?.value;

      if (!csrfTokenHeader || !csrfTokenCookie) {
        return false;
      }

      return SecurityAuth.validateCSRFToken(csrfTokenHeader, csrfTokenCookie);
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'validation_error',
        details: `CSRF validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium'
      });
      return false;
    }
  }

  /**
   * Generate CSRF token for client
   */
  static generateCSRFToken(): { token: string; cookie: string } {
    const token = SecurityAuth.generateCSRFToken();
    return {
      token,
      cookie: `csrf-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
    };
  }
}

// ===== STRIPE WEBHOOK SECURITY =====

export class StripeWebhookSecurity {
  private static webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  /**
   * Verify Stripe webhook signature
   */
  static async verifyStripeWebhook(
    request: NextRequest,
    body: string
  ): Promise<{ valid: boolean; event?: any }> {
    try {
      const signature = request.headers.get('stripe-signature');
      
      if (!signature) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: ApiAuthentication['getClientIP'](request),
          details: 'Missing Stripe signature header',
          severity: 'high'
        });
        return { valid: false };
      }

      // Verify signature using crypto
      const elements = signature.split(',');
      let timestamp: string | undefined;
      let v1: string | undefined;

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') v1 = value;
      }

      if (!timestamp || !v1) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: ApiAuthentication['getClientIP'](request),
          details: 'Invalid Stripe signature format',
          severity: 'high'
        });
        return { valid: false };
      }

      // Check timestamp (prevent replay attacks)
      const timestampNum = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - timestampNum > 300) { // 5 minute tolerance
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: ApiAuthentication['getClientIP'](request),
          details: 'Stripe webhook timestamp too old',
          severity: 'high'
        });
        return { valid: false };
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(timestamp + '.' + body)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(v1, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: ApiAuthentication['getClientIP'](request),
          details: 'Invalid Stripe webhook signature',
          severity: 'critical'
        });
        return { valid: false };
      }

      // Parse event
      const event = JSON.parse(body);
      return { valid: true, event };

    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'validation_error',
        ip: ApiAuthentication['getClientIP'](request),
        details: `Stripe webhook verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      });
      return { valid: false };
    }
  }
}

// ===== MAIN SECURITY WRAPPER =====

export class ApiSecurityWrapper {
  /**
   * Comprehensive API security middleware
   */
  static async secureApiRoute(
    request: NextRequest,
    handler: (ctx: ApiContext) => Promise<NextResponse>,
    config: SecurityConfig = {}
  ): Promise<NextResponse> {
    try {
      const ip = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // 1. Rate Limiting
      if (config.rateLimit) {
        const rateLimitResult = await SecurityRateLimit.checkRateLimit(request, config.rateLimit);
        
        if (!rateLimitResult.allowed) {
          SecurityAudit.logSecurityEvent({
            type: 'rate_limit',
            ip,
            userAgent,
            details: 'Rate limit exceeded',
            severity: 'medium'
          });

          const response = NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );

          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0');
          response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime?.toString() || '0');

          return SecurityHeaders.applyToResponse(response);
        }
      }

      // 2. CSRF Protection for state-changing methods
      if (config.requireCSRF && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
        const csrfValid = CSRFProtection.validateCSRFToken(request);
        
        if (!csrfValid) {
          SecurityAudit.logSecurityEvent({
            type: 'validation_error',
            ip,
            userAgent,
            details: 'CSRF token validation failed',
            severity: 'high'
          });

          return SecurityHeaders.applyToResponse(
            NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 })
          );
        }
      }

      // 3. Authentication
      let user = null;
      let isAdmin = false;

      if (config.requireAuth) {
        user = await ApiAuthentication.authenticateUser(request);
        
        if (!user) {
          return SecurityHeaders.applyToResponse(
            NextResponse.json({ error: 'Authentication required' }, { status: 401 })
          );
        }
      }

      if (config.requireAdmin) {
        isAdmin = await ApiAuthentication.authenticateAdmin(request);
        
        if (!isAdmin) {
          SecurityAudit.logSecurityEvent({
            type: 'auth_failure',
            ip,
            userAgent,
            details: 'Admin authentication required but not provided',
            severity: 'high'
          });

          return SecurityHeaders.applyToResponse(
            NextResponse.json({ error: 'Admin access required' }, { status: 403 })
          );
        }
      }

      // 4. Request Validation
      if (config.schema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const validation = await SecurityValidator.validateRequest(request.clone(), config.schema);
        
        if (!validation.success) {
          SecurityAudit.logSecurityEvent({
            type: 'validation_error',
            ip,
            userAgent,
            details: `Request validation failed: ${validation.errors?.join(', ')}`,
            severity: 'medium'
          });

          return SecurityHeaders.applyToResponse(
            NextResponse.json({ 
              error: 'Validation failed', 
              details: validation.errors 
            }, { status: 400 })
          );
        }
      }

      // 5. Execute handler with context
      const context: ApiContext = {
        request,
        ip,
        userAgent,
        user,
        admin: isAdmin
      };

      const response = await handler(context);
      
      // 6. Apply security headers
      return SecurityHeaders.applyToResponse(response);

    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: `API security wrapper error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });

      return SecurityHeaders.applyToResponse(
        NextResponse.json({ error: 'Internal security error' }, { status: 500 })
      );
    }
  }

  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }
}

// ===== PREDEFINED SECURITY CONFIGURATIONS =====

export const SECURITY_CONFIGS = {
  // Public API endpoints
  public: {
    rateLimit: 'lenient' as const,
    requireAuth: false,
    requireAdmin: false,
    requireCSRF: false
  },

  // User-authenticated endpoints
  authenticated: {
    rateLimit: 'moderate' as const,
    requireAuth: true,
    requireAdmin: false,
    requireCSRF: true
  },

  // Admin-only endpoints
  admin: {
    rateLimit: 'strict' as const,
    requireAuth: false,
    requireAdmin: true,
    requireCSRF: true
  },

  // Payment processing
  payment: {
    rateLimit: 'strict' as const,
    requireAuth: false,
    requireAdmin: false,
    requireCSRF: true,
    schema: schemas.email // Will be extended per endpoint
  },

  // Webhook endpoints
  webhook: {
    rateLimit: 'moderate' as const,
    requireAuth: false,
    requireAdmin: false,
    requireCSRF: false
  }
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Quick wrapper for public endpoints
 */
export const publicApi = (
  handler: (ctx: ApiContext) => Promise<NextResponse>,
  customConfig?: Partial<SecurityConfig>
) => (request: NextRequest) => 
  ApiSecurityWrapper.secureApiRoute(
    request, 
    handler, 
    { ...SECURITY_CONFIGS.public, ...customConfig }
  );

/**
 * Quick wrapper for authenticated endpoints
 */
export const authenticatedApi = (
  handler: (ctx: ApiContext) => Promise<NextResponse>,
  customConfig?: Partial<SecurityConfig>
) => (request: NextRequest) => 
  ApiSecurityWrapper.secureApiRoute(
    request, 
    handler, 
    { ...SECURITY_CONFIGS.authenticated, ...customConfig }
  );

/**
 * Quick wrapper for admin endpoints
 */
export const adminApi = (
  handler: (ctx: ApiContext) => Promise<NextResponse>,
  customConfig?: Partial<SecurityConfig>
) => (request: NextRequest) => 
  ApiSecurityWrapper.secureApiRoute(
    request, 
    handler, 
    { ...SECURITY_CONFIGS.admin, ...customConfig }
  );

const ApiSecurity = {
  ApiSecurityWrapper,
  ApiAuthentication,
  CSRFProtection,
  StripeWebhookSecurity,
  SECURITY_CONFIGS,
  publicApi,
  authenticatedApi,
  adminApi
};

export default ApiSecurity;