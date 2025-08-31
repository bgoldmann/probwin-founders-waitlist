import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment and configuration
 * DELETE THIS FILE BEFORE PRODUCTION!
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 404 });
  }

  const debugInfo = {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    env_vars: {
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? 'SET' : 'MISSING',
      RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    },
    request_info: {
      ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent'),
      host: req.headers.get('host'),
    }
  };

  return NextResponse.json(debugInfo);
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 404 });
  }

  try {
    const body = await req.json();
    
    // Test reCAPTCHA verification
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey || secretKey === 'placeholder_secret_key') {
      return NextResponse.json({
        error: 'reCAPTCHA not configured',
        recaptcha_configured: false,
        secret_key_status: secretKey ? 'PLACEHOLDER' : 'MISSING'
      });
    }

    const token = body.token || 'test-token';
    const remoteIP = req.ip || req.headers.get('x-forwarded-for');

    // Test reCAPTCHA API call
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    
    if (remoteIP && remoteIP !== 'unknown') {
      params.append('remoteip', remoteIP);
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    return NextResponse.json({
      recaptcha_test: {
        api_response_ok: response.ok,
        api_status: response.status,
        verification_result: data,
        test_token_used: token,
        remote_ip: remoteIP,
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}