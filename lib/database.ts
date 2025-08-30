import { createServiceClient } from './supabase'
import { WaitlistApplication, SeatData, ApplicationFormData } from '../types'

/**
 * Secure database operations using service role
 * All operations bypass RLS and include proper error handling
 */
export class DatabaseOperations {
  
  /**
   * Get current seat availability for all waves
   */
  static async getSeatAvailability(): Promise<SeatData[]> {
    const supabase = createServiceClient()
    
    try {
      const { data, error } = await supabase.rpc('get_public_seat_counts')
      
      if (error) {
        console.error('Database error fetching seat counts:', error)
        throw new Error('Failed to fetch seat availability')
      }
      
      return data.map((row: any) => ({
        wave: row.wave,
        tier: row.tier as '99' | '199',
        total: row.total_seats,
        filled: Number(row.filled_seats),
        available: row.available_seats,
        fill_percentage: Number(row.fill_percentage),
        last_updated: row.last_updated,
      }))
    } catch (error) {
      console.error('Error in getSeatAvailability:', error)
      throw error
    }
  }
  
  /**
   * Create a new waitlist application
   */
  static async createApplication(
    formData: ApplicationFormData,
    metadata: {
      ip_address?: string
      user_agent?: string
      hcaptcha_score?: number
    }
  ): Promise<WaitlistApplication> {
    const supabase = createServiceClient()
    
    try {
      // Determine wave based on tier
      const wave = formData.tier === '99' ? 1 : 2
      const creditAmount = formData.tier === '99' ? 9900 : 19900
      
      const { data, error } = await supabase
        .from('waitlist_applications')
        .insert([{
          tier: formData.tier,
          wave,
          full_name: formData.full_name,
          email: formData.email.toLowerCase(),
          phone: formData.phone,
          country: formData.country,
          bankroll_range: formData.bankroll_range,
          sportsbooks: [formData.sportsbooks], // Convert to array
          time_commitment: formData.time_commitment,
          risk_profile: { level: formData.risk_profile },
          notes: formData.notes || null,
          credit_amount_cents: creditAmount,
          ip_address: metadata.ip_address,
          user_agent: metadata.user_agent,
          hcaptcha_score: metadata.hcaptcha_score,
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Database error creating application:', error)
        
        // Handle specific constraint violations
        if (error.code === '23505' && error.message.includes('unique_email_per_wave')) {
          throw new Error('You have already applied for this tier')
        }
        
        throw new Error('Failed to create application')
      }
      
      return data as WaitlistApplication
    } catch (error) {
      console.error('Error in createApplication:', error)
      throw error
    }
  }
  
  /**
   * Update application with Stripe information
   */
  static async updateApplicationStripeInfo(
    applicationId: string,
    stripeData: {
      customer_id?: string
      checkout_session_id?: string
      payment_intent_id?: string
    }
  ): Promise<void> {
    const supabase = createServiceClient()
    
    try {
      const { error } = await supabase
        .from('waitlist_applications')
        .update({
          stripe_customer_id: stripeData.customer_id,
          stripe_checkout_session_id: stripeData.checkout_session_id,
          stripe_payment_intent_id: stripeData.payment_intent_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
      
      if (error) {
        console.error('Database error updating Stripe info:', error)
        throw new Error('Failed to update payment information')
      }
    } catch (error) {
      console.error('Error in updateApplicationStripeInfo:', error)
      throw error
    }
  }
  
  /**
   * Get application by Stripe checkout session ID
   */
  static async getApplicationByStripeSession(sessionId: string): Promise<WaitlistApplication | null> {
    const supabase = createServiceClient()
    
    try {
      const { data, error } = await supabase
        .from('waitlist_applications')
        .select('*')
        .eq('stripe_checkout_session_id', sessionId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No matching record
        }
        console.error('Database error fetching application by session:', error)
        throw new Error('Failed to fetch application')
      }
      
      return data as WaitlistApplication
    } catch (error) {
      console.error('Error in getApplicationByStripeSession:', error)
      throw error
    }
  }
  
  /**
   * Create free waitlist signup
   */
  static async createFreeSignup(
    name: string,
    email: string,
    country?: string,
    utm?: {
      source?: string
      medium?: string
      campaign?: string
    },
    metadata?: {
      ip_address?: string
    }
  ): Promise<string> {
    const supabase = createServiceClient()
    
    try {
      const { data, error } = await supabase
        .from('free_waitlist')
        .insert([{
          full_name: name,
          email: email.toLowerCase(),
          country,
          utm_source: utm?.source,
          utm_medium: utm?.medium,
          utm_campaign: utm?.campaign,
          ip_address: metadata?.ip_address,
        }])
        .select('id')
        .single()
      
      if (error) {
        console.error('Database error creating free signup:', error)
        
        // Handle duplicate email
        if (error.code === '23505' && error.message.includes('email')) {
          throw new Error('Email already registered')
        }
        
        throw new Error('Failed to create signup')
      }
      
      return data.id
    } catch (error) {
      console.error('Error in createFreeSignup:', error)
      throw error
    }
  }
  
  /**
   * Log security event
   */
  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data: {
      user_identifier?: string
      ip_address?: string
      user_agent?: string
      event_data?: any
    }
  ): Promise<void> {
    const supabase = createServiceClient()
    
    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_user_identifier: data.user_identifier,
        p_ip_address: data.ip_address,
        p_user_agent: data.user_agent,
        p_event_data: data.event_data,
        p_severity: severity,
      })
      
      if (error) {
        console.error('Failed to log security event:', error)
        // Don't throw here - logging failures shouldn't break main flow
      }
    } catch (error) {
      console.error('Error in logSecurityEvent:', error)
      // Don't throw here - logging failures shouldn't break main flow
    }
  }
  
  /**
   * Check if wave has available seats
   */
  static async checkWaveAvailability(tier: '99' | '199'): Promise<{
    available: boolean
    wave: number
    total: number
    filled: number
  }> {
    const supabase = createServiceClient()
    
    try {
      const wave = tier === '99' ? 1 : 2
      
      const { data, error } = await supabase.rpc('get_public_seat_counts')
      
      if (error) {
        console.error('Database error checking wave availability:', error)
        throw new Error('Failed to check availability')
      }
      
      const waveData = data.find((row: any) => row.wave === wave)
      
      if (!waveData) {
        throw new Error('Wave not found')
      }
      
      return {
        available: waveData.available_seats > 0,
        wave: waveData.wave,
        total: waveData.total_seats,
        filled: Number(waveData.filled_seats),
      }
    } catch (error) {
      console.error('Error in checkWaveAvailability:', error)
      throw error
    }
  }
}