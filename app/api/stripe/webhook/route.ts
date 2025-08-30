import { NextRequest, NextResponse } from 'next/server'
import { StripeSecurityManager } from '../../../../lib/stripe'
import { DatabaseOperations } from '../../../../lib/database'
import { getEnv } from '../../../../lib/env'

/**
 * Stripe webhook handler with secure signature verification
 * POST /api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body and signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('Missing Stripe signature header')
      await DatabaseOperations.logSecurityEvent(
        'webhook_missing_signature',
        'high',
        {
          ip_address: req.ip,
          user_agent: req.headers.get('user-agent') || undefined,
        }
      )
      
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }
    
    // Verify webhook signature
    const isValidSignature = StripeSecurityManager.verifyWebhookSignature(
      body,
      signature,
      getEnv('STRIPE_WEBHOOK_SECRET')
    )
    
    if (!isValidSignature) {
      console.error('Invalid Stripe webhook signature')
      await DatabaseOperations.logSecurityEvent(
        'webhook_invalid_signature',
        'high',
        {
          ip_address: req.ip,
          user_agent: req.headers.get('user-agent') || undefined,
          event_data: {
            signature_provided: signature,
          }
        }
      )
      
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Parse event
    let event
    try {
      event = JSON.parse(body)
    } catch (error) {
      console.error('Failed to parse webhook body:', error)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }
    
    // Log successful webhook receipt
    await DatabaseOperations.logSecurityEvent(
      'webhook_received',
      'low',
      {
        ip_address: req.ip,
        event_data: {
          event_type: event.type,
          event_id: event.id,
        }
      }
    )
    
    // Process the event
    await StripeSecurityManager.processWebhookEvent(event)
    
    // Log successful processing
    await DatabaseOperations.logSecurityEvent(
      'webhook_processed',
      'low',
      {
        event_data: {
          event_type: event.type,
          event_id: event.id,
        }
      }
    )
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Log webhook processing error
    await DatabaseOperations.logSecurityEvent(
      'webhook_processing_error',
      'high',
      {
        ip_address: req.ip,
        event_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    )
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing for raw access to request body
export const runtime = 'nodejs'