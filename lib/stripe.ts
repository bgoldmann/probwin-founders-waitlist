import Stripe from 'stripe'
import { createHash, timingSafeEqual } from 'crypto'
import { getEnv } from './env'
import { APP_CONFIG } from './env'

// Initialize Stripe with the latest API version
export const stripe = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})

/**
 * Secure Stripe operations with PCI DSS compliance
 * Based on security audit recommendations
 */
export class StripeSecurityManager {
  private static readonly WEBHOOK_TOLERANCE = 300 // 5 minutes
  
  /**
   * Verify Stripe webhook signature with timing-safe comparison
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const timestamp = this.extractTimestamp(signature)
      const expectedSignature = this.computeSignature(timestamp, payload, secret)
      
      // Check timestamp tolerance
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - timestamp) > this.WEBHOOK_TOLERANCE) {
        console.warn('Webhook timestamp outside tolerance window')
        return false
      }
      
      // Timing-safe comparison prevents timing attacks
      return timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(this.extractSignature(signature), 'hex')
      )
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }
  
  /**
   * Create secure checkout session for waitlist application
   */
  static async createSecureCheckoutSession(params: {
    tier: '99' | '199'
    applicationId: string
    customerEmail: string
    successUrl: string
    cancelUrl: string
  }): Promise<Stripe.Checkout.Session> {
    try {
      const priceId = params.tier === '99' 
        ? getEnv('STRIPE_PRICE_ID_99')
        : getEnv('STRIPE_PRICE_ID_199')
      
      const amount = params.tier === '99' ? 99 : 199
      
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: ['card'],
        
        // Line items
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        
        // URLs
        success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.cancelUrl,
        
        // Customer information
        customer_email: params.customerEmail,
        billing_address_collection: 'required', // PCI DSS requirement
        
        // Metadata for tracking
        metadata: {
          application_id: params.applicationId,
          tier: params.tier,
          amount: amount.toString(),
          created_at: new Date().toISOString(),
          security_version: '2.0',
        },
        
        // Payment intent data
        payment_intent_data: {
          metadata: {
            application_id: params.applicationId,
            tier: params.tier,
            amount: amount.toString(),
          },
          description: `ProbWin.ai FastTrack ${params.tier === '199' ? '+' : ''} Application Fee`,
        },
        
        // Session configuration
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        allow_promotion_codes: false,
        automatic_tax: {
          enabled: false,
        },
      }
      
      const session = await stripe.checkout.sessions.create(sessionParams)
      
      return session
    } catch (error) {
      console.error('Failed to create Stripe checkout session:', error)
      throw new Error('Payment processing error')
    }
  }
  
  /**
   * Process webhook event securely
   */
  static async processWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`Processing webhook event: ${event.type}`)
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
          
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
          break
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
          break
          
        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }
    } catch (error) {
      console.error(`Error processing webhook ${event.type}:`, error)
      throw error
    }
  }
  
  /**
   * Handle successful checkout completion
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const { DatabaseOperations } = await import('./database')
      
      if (!session.metadata?.application_id) {
        throw new Error('Missing application_id in session metadata')
      }
      
      // Update application with Stripe information
      await DatabaseOperations.updateApplicationStripeInfo(
        session.metadata.application_id,
        {
          customer_id: session.customer as string,
          checkout_session_id: session.id,
          payment_intent_id: session.payment_intent as string,
        }
      )
      
      console.log(`Checkout completed for application: ${session.metadata.application_id}`)
    } catch (error) {
      console.error('Error handling checkout completion:', error)
      throw error
    }
  }
  
  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      console.log(`Payment succeeded: ${paymentIntent.id}`)
      
      // Additional payment success handling can be added here
      // e.g., sending confirmation emails, updating analytics, etc.
      
    } catch (error) {
      console.error('Error handling payment success:', error)
      throw error
    }
  }
  
  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const { DatabaseOperations } = await import('./database')
      
      console.log(`Payment failed: ${paymentIntent.id}`)
      
      // Log security event for failed payment
      await DatabaseOperations.logSecurityEvent(
        'payment_failed',
        'medium',
        {
          event_data: {
            payment_intent_id: paymentIntent.id,
            failure_code: paymentIntent.last_payment_error?.code,
            failure_message: paymentIntent.last_payment_error?.message,
          }
        }
      )
      
    } catch (error) {
      console.error('Error handling payment failure:', error)
      throw error
    }
  }
  
  /**
   * Issue refund for rejected application
   */
  static async issueRefund(paymentIntentId: string, reason: 'requested_by_customer' | 'duplicate' | 'fraudulent' = 'requested_by_customer'): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason,
        metadata: {
          refund_type: 'application_rejected',
          processed_at: new Date().toISOString(),
        },
      })
      
      console.log(`Refund issued: ${refund.id} for payment: ${paymentIntentId}`)
      return refund
      
    } catch (error) {
      console.error('Failed to issue refund:', error)
      throw new Error('Refund processing failed')
    }
  }
  
  /**
   * Get payment intent details
   */
  static async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error) {
      console.error('Failed to retrieve payment intent:', error)
      throw new Error('Payment lookup failed')
    }
  }
  
  // Private helper methods for webhook verification
  private static extractTimestamp(signature: string): number {
    const timestampMatch = signature.match(/t=(\d+)/)
    if (!timestampMatch) {
      throw new Error('Unable to extract timestamp from signature')
    }
    return parseInt(timestampMatch[1], 10)
  }
  
  private static extractSignature(signature: string): string {
    const signatureMatch = signature.match(/v1=([a-z0-9]+)/)
    if (!signatureMatch) {
      throw new Error('Unable to extract signature from header')
    }
    return signatureMatch[1]
  }
  
  private static computeSignature(timestamp: number, payload: string, secret: string): string {
    const signedPayload = `${timestamp}.${payload}`
    return createHash('sha256')
      .update(signedPayload, 'utf8')
      .update(secret, 'utf8')
      .digest('hex')
  }
}

/**
 * Helper function to get price amounts
 */
export const getPriceAmount = (tier: '99' | '199'): number => {
  return tier === '99' ? APP_CONFIG.PRICING.FASTTRACK : APP_CONFIG.PRICING.FASTTRACK_PLUS
}

/**
 * Helper function to format currency
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}