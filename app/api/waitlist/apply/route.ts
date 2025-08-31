/**
 * Waitlist Application API Route - Secure implementation
 * Handles new waitlist applications with comprehensive security
 */

import { NextRequest, NextResponse } from 'next/server';
import { publicApi } from '../../../../lib/api-security';
import { SupabaseSecureOperations } from '../../../../lib/supabase-security';
import { SecurityAudit, SecurityValidator, schemas } from '../../../../lib/security';
import { z } from 'zod';

// Application submission schema
const applicationSubmissionSchema = z.object({
  email: schemas.email,
  full_name: schemas.name,
  phone: schemas.phone.optional(),
  company: schemas.company,
  linkedin_url: schemas.linkedinUrl.optional(),
  experience_level: schemas.experience,
  industry: schemas.industry,
  motivation: schemas.motivation,
  how_heard_about: schemas.hearAbout,
  timezone: schemas.timeZone.default('America/New_York'),
  wave_type: z.enum(['fasttrack', 'fasttrack_plus']),
  gdpr_consent: z.boolean().refine(val => val === true, {
    message: "GDPR consent is required"
  }),
  marketing_consent: z.boolean().default(false),
  // reCAPTCHA verification
  'g-recaptcha-response': z.string().min(1, "Please complete the captcha verification")
});

/**
 * POST /api/waitlist/apply
 * Submit a new waitlist application
 */
export const POST = publicApi(async (context) => {
  try {
    const body = await context.request.json();

    // Validate request data
    const validation = SecurityValidator.validateFormData(body, applicationSubmissionSchema);
    
    if (!validation.success || !validation.data) {
      SecurityAudit.logSecurityEvent({
        type: 'validation_error',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Application validation failed: ${validation.errors?.join(', ')}`,
        severity: 'medium'
      });

      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Verify reCAPTCHA token
    const captchaValid = await verifyRecaptcha(validatedData['g-recaptcha-response'], context.ip);
    
    if (!captchaValid) {
      SecurityAudit.logSecurityEvent({
        type: 'validation_error',
        ip: context.ip,
        userAgent: context.userAgent,
        details: 'hCaptcha verification failed',
        severity: 'high'
      });

      return NextResponse.json(
        { error: 'Captcha verification failed' },
        { status: 400 }
      );
    }

    // Remove captcha response from data before storing
    const { 'g-recaptcha-response': captcha, ...applicationData } = validatedData;

    // Create application with security context
    const result = await SupabaseSecureOperations.createApplication(
      applicationData,
      {
        ip: context.ip,
        userAgent: context.userAgent
      }
    );

    if (!result.success) {
      // Don't expose internal errors to client
      return NextResponse.json(
        { error: result.error || 'Failed to create application' },
        { status: result.error?.includes('duplicate') ? 409 : 500 }
      );
    }

    // Log successful application
    SecurityAudit.logSecurityEvent({
      type: 'suspicious_activity', // Using for audit logging
      ip: context.ip,
      userAgent: context.userAgent,
      details: `Application created successfully for wave: ${applicationData.wave_type}`,
      severity: 'low'
    });

    // Return sanitized response
    const sanitizedApplication = {
      id: result.data?.id,
      email: result.data?.email,
      status: result.data?.status,
      wave_type: result.data?.wave_type,
      wave_number: result.data?.wave_number,
      created_at: result.data?.created_at
    };

    return NextResponse.json(
      {
        success: true,
        data: sanitizedApplication,
        message: 'Application submitted successfully'
      },
      {
        status: 201,
        headers: {
          'Location': `/api/waitlist/status/${result.data?.id}`
        }
      }
    );

  } catch (error) {
    SecurityAudit.logSecurityEvent({
      type: 'suspicious_activity',
      ip: context.ip,
      userAgent: context.userAgent,
      details: `Application API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, {
  rateLimit: 'strict', // Very strict rate limiting for applications
  schema: applicationSubmissionSchema,
  requireCSRF: true
});

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(token: string, remoteip?: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey || secretKey === 'placeholder_secret_key') {
      console.warn('reCAPTCHA verification bypassed in development');
      return true;
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(remoteip && { remoteip })
      }),
    });

    if (!response.ok) {
      console.error('reCAPTCHA verification request failed');
      return false;
    }

    const data = await response.json();
    return data.success === true;
    
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}