/**
 * Stripe Security Configuration for ProbWin.ai
 * Provides secure Stripe integration with PCI DSS compliance considerations
 * and comprehensive payment processing security
 */

import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  SecurityValidator, 
  SecurityAudit, 
  SecurityAuth,
  SecuritySanitizer,
  schemas 
} from '@/lib/security';
import { StripeWebhookSecurity, ApiContext } from '@/lib/api-security';

// ===== STRIPE INITIALIZATION =====

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
  telemetry: false, // Disable telemetry for privacy
});

// ===== VALIDATION SCHEMAS =====

export const stripeSchemas = {
  // Payment intent creation
  createPayment: z.object({
    amount: z.number().min(9900).max(19900), // $99 or $199 only
    currency: z.literal('usd'),
    email: schemas.email,
    name: schemas.name,
    metadata: z.object({
      applicantId: z.string().uuid(),
      waveType: z.enum(['fasttrack', 'fasttrack_plus']),
      source: z.string().max(50).default('waitlist')
    })
  }),

  // Checkout session creation
  createCheckout: z.object({
    priceId: z.string().regex(/^price_[a-zA-Z0-9]+$/, "Invalid Stripe price ID"),
    email: schemas.email,
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    metadata: z.object({
      applicantId: z.string().uuid(),
      waveType: z.enum(['fasttrack', 'fasttrack_plus'])
    })
  }),

  // Webhook validation
  webhookEvent: z.object({
    id: z.string(),
    object: z.literal('event'),
    type: z.string(),
    data: z.object({
      object: z.any()
    }),
    created: z.number(),
    livemode: z.boolean(),
    request: z.object({
      id: z.string().nullable(),
      idempotency_key: z.string().nullable()
    }).nullable()
  })
};

// ===== PAYMENT SECURITY CLASS =====

export class StripePaymentSecurity {
  private static readonly ALLOWED_AMOUNTS = [9900, 19900]; // $99, $199 in cents
  private static readonly ALLOWED_CURRENCIES = ['usd'];
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Create secure checkout session
   */
  static async createSecureCheckoutSession(
    context: ApiContext,
    data: any
  ): Promise<{ success: boolean; url?: string; error?: string; sessionId?: string }> {
    try {
      // Validate input data
      const validation = SecurityValidator.validateFormData(data, stripeSchemas.createCheckout);
      
      if (!validation.success || !validation.data) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Invalid checkout data: ${validation.errors?.join(', ')}`,
          severity: 'medium'
        });
        return { success: false, error: 'Invalid payment data' };
      }

      const { priceId, email, successUrl, cancelUrl, metadata } = validation.data;

      // Verify price ID matches allowed amounts
      const priceDetails = await this.validatePriceId(priceId);
      if (!priceDetails.valid) {
        SecurityAudit.logSecurityEvent({
          type: 'suspicious_activity',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Invalid or manipulated price ID: ${priceId}`,
          severity: 'high'
        });
        return { success: false, error: 'Invalid price configuration' };
      }

      // Create idempotency key to prevent double charges
      const idempotencyKey = SecurityAuth.generateApiKey();

      // Create checkout session with security constraints
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        payment_intent_data: {
          metadata: {
            ...metadata,
            ip: SecurityAuth.hashSensitiveData(context.ip),
            userAgent: SecurityAuth.hashSensitiveData(context.userAgent),
            timestamp: new Date().toISOString()
          }
        },
        metadata: {
          ...metadata,
          securityHash: this.generateSecurityHash(metadata)
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minute expiry
        // Security settings
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['US', 'CA'] // Restrict to allowed countries
        },
        // Prevent certain payment methods for fraud prevention
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic',
          }
        }
      }, {
        idempotencyKey
      });

      // Log successful creation
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Checkout session created: ${session.id}`,
        severity: 'low'
      });

      return {
        success: true,
        url: session.url || undefined,
        sessionId: session.id
      };

    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Checkout session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });

      return { success: false, error: 'Payment processing error' };
    }
  }

  /**
   * Validate price ID against allowed amounts
   */
  private static async validatePriceId(priceId: string): Promise<{ valid: boolean; amount?: number }> {
    try {
      const price = await stripe.prices.retrieve(priceId);
      
      if (!price.active) {
        return { valid: false };
      }

      if (!this.ALLOWED_CURRENCIES.includes(price.currency)) {
        return { valid: false };
      }

      if (!this.ALLOWED_AMOUNTS.includes(price.unit_amount || 0)) {
        return { valid: false };
      }

      return { valid: true, amount: price.unit_amount || 0 };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Generate security hash for metadata validation
   */
  private static generateSecurityHash(metadata: any): string {
    const hashInput = JSON.stringify(metadata) + process.env.STRIPE_WEBHOOK_SECRET!;
    return SecurityAuth.hashSensitiveData(hashInput);
  }

  /**
   * Process webhook securely
   */
  static async processWebhookSecurely(
    context: ApiContext,
    body: string
  ): Promise<{ success: boolean; processed?: boolean; error?: string }> {
    try {
      // Verify webhook signature
      const verification = await StripeWebhookSecurity.verifyStripeWebhook(
        context.request,
        body
      );

      if (!verification.valid || !verification.event) {
        return { success: false, error: 'Invalid webhook signature' };
      }

      const event = verification.event;

      // Validate event structure
      const validation = SecurityValidator.validateFormData(event, stripeSchemas.webhookEvent);
      
      if (!validation.success || !validation.data) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          details: `Invalid webhook event structure: ${validation.errors?.join(', ')}`,
          severity: 'high'
        });
        return { success: false, error: 'Invalid event structure' };
      }

      const validatedEvent = validation.data;

      // Process different event types
      let processed = false;
      switch (validatedEvent.type) {
        case 'checkout.session.completed':
          processed = await this.handleCheckoutCompleted(validatedEvent.data.object, context);
          break;
        
        case 'payment_intent.succeeded':
          processed = await this.handlePaymentSucceeded(validatedEvent.data.object, context);
          break;
        
        case 'payment_intent.payment_failed':
          processed = await this.handlePaymentFailed(validatedEvent.data.object, context);
          break;
        
        case 'invoice.payment_succeeded':
          // For subscription payments (if added later)
          processed = true;
          break;

        default:
          // Log unhandled event types for monitoring
          SecurityAudit.logSecurityEvent({
            type: 'suspicious_activity',
            ip: context.ip,
            details: `Unhandled webhook event type: ${validatedEvent.type}`,
            severity: 'low'
          });
          processed = true; // Return success to avoid retries
      }

      return { success: true, processed };

    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        details: `Webhook processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      });

      return { success: false, error: 'Webhook processing failed' };
    }
  }

  /**
   * Handle successful checkout completion
   */
  private static async handleCheckoutCompleted(
    session: any,
    context: ApiContext
  ): Promise<boolean> {
    try {
      // Validate session metadata
      if (!session.metadata?.applicantId || !session.metadata?.waveType) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          details: `Missing metadata in checkout session: ${session.id}`,
          severity: 'high'
        });
        return false;
      }

      // Verify security hash
      const expectedHash = this.generateSecurityHash({
        applicantId: session.metadata.applicantId,
        waveType: session.metadata.waveType
      });

      if (session.metadata.securityHash !== expectedHash) {
        SecurityAudit.logSecurityEvent({
          type: 'suspicious_activity',
          ip: context.ip,
          details: `Security hash mismatch for session: ${session.id}`,
          severity: 'critical'
        });
        return false;
      }

      // TODO: Update applicant status in database
      // This would typically involve updating Supabase records
      
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        details: `Payment completed successfully for applicant: ${SecurityAuth.hashSensitiveData(session.metadata.applicantId)}`,
        severity: 'low'
      });

      return true;
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        details: `Error handling checkout completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return false;
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(
    paymentIntent: any,
    context: ApiContext
  ): Promise<boolean> {
    try {
      // Validate payment amount
      if (!this.ALLOWED_AMOUNTS.includes(paymentIntent.amount)) {
        SecurityAudit.logSecurityEvent({
          type: 'suspicious_activity',
          ip: context.ip,
          details: `Unexpected payment amount: ${paymentIntent.amount}`,
          severity: 'critical'
        });
        return false;
      }

      // Log successful payment
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        details: `Payment succeeded: ${paymentIntent.id}`,
        severity: 'low'
      });

      return true;
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        details: `Error handling payment success: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return false;
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    paymentIntent: any,
    context: ApiContext
  ): Promise<boolean> {
    try {
      // Log payment failure for monitoring
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        details: `Payment failed: ${paymentIntent.id} - ${paymentIntent.last_payment_error?.message || 'Unknown reason'}`,
        severity: 'medium'
      });

      // TODO: Update applicant status to reflect payment failure
      // This would typically involve updating Supabase records

      return true;
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        details: `Error handling payment failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return false;
    }
  }

  /**
   * Retrieve payment details securely
   */
  static async getPaymentDetails(
    paymentIntentId: string,
    context: ApiContext
  ): Promise<{ success: boolean; payment?: any; error?: string }> {
    try {
      // Validate payment intent ID format
      if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
        return { success: false, error: 'Invalid payment ID format' };
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Sanitize sensitive data before returning
      const sanitizedPayment = {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata
      };

      return { success: true, payment: sanitizedPayment };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'validation_error',
        ip: context.ip,
        details: `Failed to retrieve payment details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium'
      });

      return { success: false, error: 'Payment retrieval failed' };
    }
  }
}

// ===== PCI DSS COMPLIANCE UTILITIES =====

export class PCIComplianceUtils {
  /**
   * Get PCI DSS compliance headers
   */
  static getPCIHeaders(): Record<string, string> {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.stripe.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'"
      ].join('; ')
    };
  }

  /**
   * Validate PCI DSS requirements
   */
  static validatePCIRequirements(): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') && 
        !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      issues.push('Invalid Stripe secret key format');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      issues.push('Missing Stripe webhook secret');
    }

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      issues.push('Missing Stripe publishable key');
    }

    // Security recommendations
    recommendations.push('Use Stripe Elements for card data collection');
    recommendations.push('Implement proper webhook signature verification');
    recommendations.push('Use HTTPS for all payment-related communications');
    recommendations.push('Regularly rotate webhook secrets');
    recommendations.push('Implement proper logging and monitoring');
    recommendations.push('Use strong authentication for admin access');

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// ===== CONSTANTS AND CONFIGURATION =====

export const STRIPE_CONFIG = {
  FASTTRACK_PRICE_ID: process.env.STRIPE_FASTTRACK_PRICE_ID!,
  FASTTRACK_PLUS_PRICE_ID: process.env.STRIPE_FASTTRACK_PLUS_PRICE_ID!,
  
  AMOUNTS: {
    FASTTRACK: 9900, // $99
    FASTTRACK_PLUS: 19900 // $199
  },
  
  WEBHOOK_ENDPOINTS: {
    PAYMENT_SUCCESS: '/api/webhooks/stripe',
  },
  
  ALLOWED_COUNTRIES: ['US', 'CA'],
  
  SESSION_EXPIRES_MINUTES: 30,
  
  // Security settings
  REQUIRE_3DS: true,
  REQUIRE_BILLING_ADDRESS: true,
  MAX_RETRY_ATTEMPTS: 3
} as const;

const StripeSecurity = {
  StripePaymentSecurity,
  PCIComplianceUtils,
  stripeSchemas,
  STRIPE_CONFIG,
  stripe
};

export default StripeSecurity;