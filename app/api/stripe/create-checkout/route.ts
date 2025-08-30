import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { StripeSecurityManager } from '../../../../lib/stripe'
import { DatabaseOperations } from '../../../../lib/database'
import { getEnv } from '../../../../lib/env'

// Request validation schema
const createCheckoutSchema = z.object({
  applicationId: z.string().uuid(),
  tier: z.enum(['99', '199']),
})

/**
 * Create Stripe checkout session for waitlist application
 * POST /api/stripe/create-checkout
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const { applicationId, tier } = createCheckoutSchema.parse(body)
    
    // Get application details from database
    const application = await DatabaseOperations.getApplicationByStripeSession(applicationId)
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }
    
    // Check if application already has a payment
    if (application.stripe_checkout_session_id) {
      return NextResponse.json(
        { error: 'Payment already initiated for this application' },
        { status: 409 }
      )
    }
    
    // Create checkout session
    const session = await StripeSecurityManager.createSecureCheckoutSession({
      tier,
      applicationId,
      customerEmail: application.email,
      successUrl: `${getEnv('NEXT_PUBLIC_BASE_URL')}/success`,
      cancelUrl: `${getEnv('NEXT_PUBLIC_BASE_URL')}/waitlist`,
    })
    
    // Update application with session ID
    await DatabaseOperations.updateApplicationStripeInfo(applicationId, {
      checkout_session_id: session.id,
    })
    
    // Log security event
    await DatabaseOperations.logSecurityEvent(
      'checkout_session_created',
      'low',
      {
        user_identifier: application.email,
        ip_address: req.ip,
        event_data: {
          application_id: applicationId,
          tier,
          session_id: session.id,
        }
      }
    )
    
    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
    
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    // Log security event for errors
    await DatabaseOperations.logSecurityEvent(
      'checkout_creation_failed',
      'medium',
      {
        ip_address: req.ip,
        event_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    )
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
  }
}