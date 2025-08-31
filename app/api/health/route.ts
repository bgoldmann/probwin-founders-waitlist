import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint - production safe
 */
export async function GET(req: NextRequest) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      recaptcha_configured: !!(process.env.RECAPTCHA_SECRET_KEY && process.env.RECAPTCHA_SECRET_KEY !== 'placeholder_secret_key'),
      supabase_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      jwt_configured: !!process.env.JWT_SECRET,
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    }
  };

  return NextResponse.json(health);
}