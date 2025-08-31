import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Next.js
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRICE_ID_99: z.string().min(1),
  STRIPE_PRICE_ID_199: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  
  // Email
  RESEND_API_KEY: z.string().min(1),
  
  // Security
  RECAPTCHA_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email(),
  SECURITY_SALT: z.string().min(16),
});

// Validate environment variables
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

// Helper to get validated environment variables
export const env = {
  get: () => {
    if (typeof window !== 'undefined') {
      // Client-side environment variables
      return {
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL!,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
      };
    } else {
      // Server-side environment variables
      return validateEnv();
    }
  }
};

// Type-safe environment variable access
export const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Check if we're in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Application constants
export const APP_CONFIG = {
  WAVE_CAPS: {
    1: 100, // Wave 1: FastTrack ($99) - 100 seats
    2: 500, // Wave 2: FastTrack+ ($199) - 500 seats
  },
  PRICING: {
    FASTTRACK: 99,
    FASTTRACK_PLUS: 199,
    FOUNDERS_MONTHLY: 699,
    STANDARD_MONTHLY: 899,
  },
  DEADLINES: {
    ACTIVATION_DAYS: 14,
    DEFERRAL_DAYS: 30,
    INTERVIEW_SLA_FASTTRACK_PLUS_HOURS: 72,
    DECISION_SLA_FASTTRACK_PLUS_DAYS: 5,
    DECISION_SLA_FASTTRACK_WEEKS: 3,
  },
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    JWT_EXPIRY_HOURS: 1,
    RATE_LIMIT_WINDOW_MINUTES: 15,
  },
} as const;