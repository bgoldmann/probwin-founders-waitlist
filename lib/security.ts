/**
 * Security Utility Library for ProbWin.ai
 * Provides comprehensive security functions for input validation, sanitization,
 * and protection against common web vulnerabilities
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { NextRequest, NextResponse } from 'next/server';

// ===== INPUT VALIDATION SCHEMAS =====

export const schemas = {
  email: z.string().email().max(254).refine(
    (email) => !email.includes('<script>') && !email.includes('javascript:'),
    { message: "Invalid email format" }
  ),
  
  phone: z.string().regex(
    /^\+?[1-9]\d{1,14}$/,
    "Invalid phone number format"
  ).max(20),
  
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Invalid characters in name"),
  
  company: z.string()
    .min(1, "Company is required")
    .max(200, "Company name too long")
    .regex(/^[a-zA-Z0-9\s\-'\.&,]+$/, "Invalid characters in company name"),
  
  linkedinUrl: z.string().url().refine(
    (url) => url.includes('linkedin.com/in/') || url === '',
    { message: "Must be a valid LinkedIn profile URL" }
  ).optional(),
  
  experience: z.enum(['0-2', '3-5', '6-10', '10+'], {
    errorMap: () => ({ message: "Please select a valid experience range" })
  }),
  
  industry: z.enum([
    'technology', 'finance', 'healthcare', 'education', 'retail',
    'manufacturing', 'consulting', 'media', 'real-estate', 'other'
  ], {
    errorMap: () => ({ message: "Please select a valid industry" })
  }),
  
  timeZone: z.string().max(50).regex(
    /^[A-Za-z_\/]+$/,
    "Invalid timezone format"
  ),
  
  hearAbout: z.enum([
    'search', 'social', 'referral', 'advertising', 'other'
  ], {
    errorMap: () => ({ message: "Please select how you heard about us" })
  }),
  
  motivation: z.string()
    .min(10, "Please provide more detail")
    .max(1000, "Response too long")
    .refine(
      (text) => !/<script|javascript:|data:|vbscript:/i.test(text),
      { message: "Invalid content detected" }
    ),
  
  // Seat data validation for scarcity meter
  seatData: z.array(z.object({
    wave: z.number().int().min(1).max(10),
    filled: z.number().int().min(0).max(10000),
    total: z.number().int().min(1).max(10000),
    lastUpdated: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))
  })).max(10),
  
  // Admin authentication
  adminToken: z.string().min(32).max(512),
  
  // API key validation
  apiKey: z.string().uuid().or(z.string().min(32)),
};

// ===== INPUT SANITIZATION =====

export class SecuritySanitizer {
  /**
   * Sanitizes HTML content using DOMPurify
   */
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }

  /**
   * Sanitizes and validates text input
   */
  static sanitizeText(input: string, maxLength = 1000): string {
    if (typeof input !== 'string') return '';
    
    // Remove potential XSS vectors
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    // Apply DOMPurify
    sanitized = DOMPurify.sanitize(sanitized);
    
    // Trim and limit length
    return sanitized.trim().substring(0, maxLength);
  }

  /**
   * Sanitizes localStorage data before parsing
   */
  static sanitizeLocalStorageData(data: string): any {
    try {
      // First sanitize the raw string
      const sanitized = this.sanitizeText(data, 10000);
      
      // Parse JSON safely
      const parsed = JSON.parse(sanitized);
      
      // Additional validation for common patterns
      if (typeof parsed === 'object' && parsed !== null) {
        return this.deepSanitizeObject(parsed);
      }
      
      return parsed;
    } catch (error) {
      throw new Error('Invalid JSON data');
    }
  }

  /**
   * Deep sanitizes object properties
   */
  private static deepSanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key, 100);
        if (typeof value === 'string') {
          sanitized[sanitizedKey] = this.sanitizeText(value);
        } else if (typeof value === 'object') {
          sanitized[sanitizedKey] = this.deepSanitizeObject(value);
        } else {
          sanitized[sanitizedKey] = value;
        }
      }
      return sanitized;
    }
    
    return obj;
  }
}

// ===== VALIDATION UTILITIES =====

export class SecurityValidator {
  /**
   * Validates and sanitizes form data
   */
  static validateFormData<T>(data: unknown, schema: z.ZodSchema<T>): {
    success: boolean;
    data?: T;
    errors?: string[];
  } {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          errors: result.error.errors.map(err => err.message)
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Validation failed']
      };
    }
  }

  /**
   * Validates API request data
   */
  static async validateRequest(
    request: Request,
    schema: z.ZodSchema
  ): Promise<{ success: boolean; data?: any; errors?: string[] }> {
    try {
      const contentType = request.headers.get('content-type');
      
      if (!contentType?.includes('application/json')) {
        return {
          success: false,
          errors: ['Invalid content type. Expected application/json']
        };
      }
      
      const body = await request.json();
      return this.validateFormData(body, schema);
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON data']
      };
    }
  }
}

// ===== RATE LIMITING =====

const rateLimitConfigs = {
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many requests, please try again later',
  },
  moderate: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Rate limit exceeded, please try again later',
  },
  lenient: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Rate limit exceeded, please try again later',
  }
};

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();

export class SecurityRateLimit {
  /**
   * Simple rate limiting for Next.js API routes
   */
  static async checkRateLimit(
    request: NextRequest, 
    config: 'strict' | 'moderate' | 'lenient' = 'moderate'
  ): Promise<{ allowed: boolean; remaining?: number; resetTime?: number }> {
    const ip = this.getClientIP(request);
    const key = `rate-limit:${ip}`;
    const now = Date.now();
    const limiterConfig = rateLimitConfigs[config];
    
    let record = rateLimitStore.get(key) || { count: 0, resetTime: now + limiterConfig.windowMs };
    
    // Reset if window expired
    if (now >= record.resetTime) {
      record = { count: 0, resetTime: now + limiterConfig.windowMs };
    }
    
    record.count++;
    rateLimitStore.set(key, record);
    
    const allowed = record.count <= limiterConfig.max;
    const remaining = Math.max(0, limiterConfig.max - record.count);
    
    return {
      allowed,
      remaining,
      resetTime: record.resetTime
    };
  }

  /**
   * Get client IP address safely
   */
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

// ===== AUTHENTICATION UTILITIES =====

export class SecurityAuth {
  /**
   * Generate secure API key
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive data (for logging, etc.)
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8) + '***';
  }

  /**
   * Validate admin session token
   */
  static validateAdminToken(token: string, expectedToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(token, 'base64'),
      Buffer.from(expectedToken, 'base64')
    );
  }
}

// ===== SECURE HEADERS =====

export class SecurityHeaders {
  /**
   * Get comprehensive security headers for API responses
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      
      // HSTS (if using HTTPS)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.stripe.com https://*.supabase.co",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ].join('; '),
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions policy
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'payment=(self)'
      ].join(', ')
    };
  }

  /**
   * Apply security headers to NextResponse
   */
  static applyToResponse(response: NextResponse): NextResponse {
    const headers = this.getSecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}

// ===== AUDIT LOGGING =====

export class SecurityAudit {
  /**
   * Log security events (in production, send to monitoring service)
   */
  static logSecurityEvent(event: {
    type: 'auth_failure' | 'rate_limit' | 'validation_error' | 'suspicious_activity';
    ip?: string;
    userAgent?: string;
    details: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      ip: event.ip ? SecurityAuth.hashSensitiveData(event.ip) : 'unknown'
    };
    
    // In production, send to your security monitoring service
    console.warn('[SECURITY EVENT]', JSON.stringify(logEntry));
    
    // For critical events, you might want to alert immediately
    if (event.severity === 'critical') {
      // TODO: Implement alerting mechanism
      console.error('[CRITICAL SECURITY EVENT]', logEntry);
    }
  }
}

// ===== CONSTANTS =====

export const SECURITY_CONSTANTS = {
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FIELD_LENGTH: 10000,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  CSRF_TOKEN_LENGTH: 32,
  API_KEY_LENGTH: 32,
} as const;

const Security = {
  schemas,
  SecuritySanitizer,
  SecurityValidator,
  SecurityRateLimit,
  SecurityAuth,
  SecurityHeaders,
  SecurityAudit,
  SECURITY_CONSTANTS
};

export default Security;