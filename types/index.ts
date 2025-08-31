// Application types for ProbWin.ai waitlist

export type WaitlistTier = '99' | '199';
export type WaitlistStatus = 'pending' | 'interviewed' | 'accepted' | 'rejected' | 'refunded' | 'activated' | 'expired' | 'deferred';
export type WaveStatus = 'upcoming' | 'open' | 'closed' | 'full';

export interface WaitlistApplication {
  id: string;
  created_at: string;
  updated_at: string;
  tier: WaitlistTier;
  wave: number;
  status: WaitlistStatus;
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  bankroll_range?: string;
  sportsbooks?: string[];
  risk_profile?: any;
  time_commitment?: string;
  experience_level?: string;
  notes?: string;
  stripe_customer_id?: string;
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
  credit_amount_cents: number;
  interview_scheduled_at?: string;
  interview_completed_at?: string;
  decision_made_at?: string;
  decision_made_by?: string;
  activation_deadline?: string;
  deferred_until?: string;
  ip_address?: string;
  user_agent?: string;
  recaptcha_verified?: boolean;
  fraud_score?: number;
}

export interface Wave {
  id: number;
  tier: WaitlistTier;
  total_seats: number;
  status: WaveStatus;
  opens_at?: string;
  closes_at?: string;
  created_at: string;
}

export interface SeatData {
  wave: number;
  tier: WaitlistTier;
  total: number;
  filled: number;
  available: number;
  fill_percentage: number;
  last_updated: string;
}

export interface ApplicationFormData {
  tier: WaitlistTier;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  bankroll_range: string;
  sportsbooks: string;
  time_commitment: string;
  risk_profile: string;
  notes?: string;
  eligibility_agreed: boolean;
  recaptcha_token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StripeCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  event_data: any;
}

export interface AdminUser {
  email: string;
  role: 'admin';
  authenticated_at: Date;
}

export interface GDPRResponse {
  success: boolean;
  message: string;
  request_id: string;
}

// Form validation errors
export interface FormErrors {
  [key: string]: string | undefined;
}

// Environment variables type
export interface ProcessEnv {
  NEXT_PUBLIC_BASE_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_PRICE_ID_99: string;
  STRIPE_PRICE_ID_199: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  RECAPTCHA_SECRET_KEY: string;
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: string;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  SECURITY_SALT: string;
}