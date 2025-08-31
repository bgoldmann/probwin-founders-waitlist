import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  env.get().NEXT_PUBLIC_SUPABASE_URL,
  env.get().NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Server-side Supabase client with service role key (bypass RLS)
export const createServiceClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Service client should only be used server-side')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Database types (auto-generated from Supabase)
export interface Database {
  public: {
    Tables: {
      waitlist_applications: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          tier: '99' | '199'
          wave: number
          status: 'pending' | 'interviewed' | 'accepted' | 'rejected' | 'refunded' | 'activated' | 'expired' | 'deferred'
          full_name: string
          email: string
          phone: string | null
          country: string | null
          bankroll_range: string | null
          sportsbooks: string[] | null
          risk_profile: any | null
          time_commitment: string | null
          experience_level: string | null
          notes: string | null
          stripe_customer_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          credit_amount_cents: number
          interview_scheduled_at: string | null
          interview_completed_at: string | null
          decision_made_at: string | null
          decision_made_by: string | null
          activation_deadline: string | null
          deferred_until: string | null
          ip_address: string | null
          user_agent: string | null
          recaptcha_verified: boolean | null
          fraud_score: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          tier: '99' | '199'
          wave: number
          status?: 'pending' | 'interviewed' | 'accepted' | 'rejected' | 'refunded' | 'activated' | 'expired' | 'deferred'
          full_name: string
          email: string
          phone?: string | null
          country?: string | null
          bankroll_range?: string | null
          sportsbooks?: string[] | null
          risk_profile?: any | null
          time_commitment?: string | null
          experience_level?: string | null
          notes?: string | null
          stripe_customer_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          credit_amount_cents?: number
          interview_scheduled_at?: string | null
          interview_completed_at?: string | null
          decision_made_at?: string | null
          decision_made_by?: string | null
          activation_deadline?: string | null
          deferred_until?: string | null
          ip_address?: string | null
          user_agent?: string | null
          recaptcha_verified?: boolean | null
          fraud_score?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          tier?: '99' | '199'
          wave?: number
          status?: 'pending' | 'interviewed' | 'accepted' | 'rejected' | 'refunded' | 'activated' | 'expired' | 'deferred'
          full_name?: string
          email?: string
          phone?: string | null
          country?: string | null
          bankroll_range?: string | null
          sportsbooks?: string[] | null
          risk_profile?: any | null
          time_commitment?: string | null
          experience_level?: string | null
          notes?: string | null
          stripe_customer_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          credit_amount_cents?: number
          interview_scheduled_at?: string | null
          interview_completed_at?: string | null
          decision_made_at?: string | null
          decision_made_by?: string | null
          activation_deadline?: string | null
          deferred_until?: string | null
          ip_address?: string | null
          user_agent?: string | null
          recaptcha_verified?: boolean | null
          fraud_score?: number | null
        }
      }
      free_waitlist: {
        Row: {
          id: string
          created_at: string
          full_name: string
          email: string
          country: string | null
          converted_to_paid_at: string | null
          unsubscribed_at: string | null
          ip_address: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          full_name: string
          email: string
          country?: string | null
          converted_to_paid_at?: string | null
          unsubscribed_at?: string | null
          ip_address?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string
          email?: string
          country?: string | null
          converted_to_paid_at?: string | null
          unsubscribed_at?: string | null
          ip_address?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
        }
      }
      waves: {
        Row: {
          id: number
          tier: '99' | '199'
          total_seats: number
          status: 'upcoming' | 'open' | 'closed' | 'full'
          opens_at: string | null
          closes_at: string | null
          created_at: string
        }
        Insert: {
          id: number
          tier: '99' | '199'
          total_seats: number
          status?: 'upcoming' | 'open' | 'closed' | 'full'
          opens_at?: string | null
          closes_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          tier?: '99' | '199'
          total_seats?: number
          status?: 'upcoming' | 'open' | 'closed' | 'full'
          opens_at?: string | null
          closes_at?: string | null
          created_at?: string
        }
      }
      security_audit_log: {
        Row: {
          id: string
          event_type: string
          user_identifier: string | null
          ip_address: string | null
          user_agent: string | null
          event_data: any | null
          severity: 'low' | 'medium' | 'high' | 'critical'
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          user_identifier?: string | null
          ip_address?: string | null
          user_agent?: string | null
          event_data?: any | null
          severity: 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          user_identifier?: string | null
          ip_address?: string | null
          user_agent?: string | null
          event_data?: any | null
          severity?: 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
        }
      }
    }
    Views: {
      v_seat_counts: {
        Row: {
          wave: number
          tier: '99' | '199'
          total_seats: number
          filled_seats: number
          available_seats: number
          fill_percentage: number
          last_updated: string
        }
      }
    }
  }
}