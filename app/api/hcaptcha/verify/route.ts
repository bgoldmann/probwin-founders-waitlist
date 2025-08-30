import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { HCaptchaVerifier } from '../../../../lib/hcaptcha'
import { DatabaseOperations } from '../../../../lib/database'

// Validation schema for hCaptcha verification
const verifySchema = z.object({
  token: z.string().min(100, 'Invalid captcha token'),
})

/**
 * Verify hCaptcha token
 * POST /api/hcaptcha/verify
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const body = await req.json()
    const { token } = verifySchema.parse(body)
    
    const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = req.headers.get('user-agent')
    
    // Verify the hCaptcha token
    const result = await HCaptchaVerifier.verify(token, clientIP)
    
    // Log verification result
    await DatabaseOperations.logSecurityEvent(
      'hcaptcha_verification_api',
      result.success ? 'low' : 'medium',
      {
        ip_address: clientIP,
        user_agent: userAgent || undefined,
        event_data: {
          success: result.success,
          error_codes: result.errorCodes,
          score: result.score,
          risk_reason: result.riskReason,
        }
      }
    )
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Captcha verification failed',
          details: result.riskReason || 'Invalid captcha response',
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      score: result.score,
    })
    
  } catch (error) {
    console.error('hCaptcha verification API error:', error)
    
    // Log API error
    await DatabaseOperations.logSecurityEvent(
      'hcaptcha_verification_api_error',
      'high',
      {
        ip_address: req.ip,
        user_agent: req.headers.get('user-agent') || undefined,
        event_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    )
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * Get hCaptcha configuration status (development only)
 * GET /api/hcaptcha/verify
 */
export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    )
  }
  
  try {
    const configStatus = HCaptchaVerifier.validateConfiguration()
    const testResult = await HCaptchaVerifier.testConfiguration()
    
    return NextResponse.json({
      configuration: configStatus,
      connectivity: testResult,
      environment: process.env.NODE_ENV,
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}