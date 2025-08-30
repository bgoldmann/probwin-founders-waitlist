/**
 * Supabase Security Utilities for ProbWin.ai
 * Provides secure database operations with RLS enforcement
 * and comprehensive data protection
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SecurityAudit, SecuritySanitizer, SecurityValidator, schemas } from '@/lib/security';

// ===== TYPES AND INTERFACES =====

export interface WaitlistApplication {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  company?: string;
  linkedin_url?: string;
  experience_level: '0-2' | '3-5' | '6-10' | '10+';
  industry: string;
  motivation: string;
  how_heard_about: 'search' | 'social' | 'referral' | 'advertising' | 'other';
  timezone: string;
  preferred_interview_times?: any;
  status: 'pending' | 'under_review' | 'interview_scheduled' | 'interview_completed' | 'accepted' | 'rejected' | 'withdrawn';
  wave_type: 'fasttrack' | 'fasttrack_plus';
  wave_number: number;
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed';
  payment_intent_id?: string;
  stripe_customer_id?: string;
  amount_paid?: number;
  paid_at?: string;
  gdpr_consent: boolean;
  gdpr_consent_date?: string;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'interviewer' | 'viewer';
  permissions: Record<string, boolean>;
  is_active: boolean;
  last_login?: string;
  failed_login_attempts: number;
  account_locked_until?: string;
}

export interface SeatAvailability {
  id: string;
  wave_number: number;
  wave_type: 'fasttrack' | 'fasttrack_plus';
  total_seats: number;
  filled_seats: number;
  available_seats: number;
  is_active: boolean;
  opens_at?: string;
  closes_at?: string;
}

export interface AuditLog {
  id: string;
  event_type: string;
  table_name?: string;
  record_id?: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  ip_address?: string;
  user_agent_hash?: string;
  created_at: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// ===== VALIDATION SCHEMAS =====

const waitlistApplicationSchema = z.object({
  email: schemas.email,
  full_name: schemas.name,
  phone: schemas.phone.optional(),
  company: schemas.company.optional(),
  linkedin_url: schemas.linkedinUrl.optional(),
  experience_level: schemas.experience,
  industry: schemas.industry,
  motivation: schemas.motivation,
  how_heard_about: schemas.hearAbout,
  timezone: schemas.timeZone,
  wave_type: z.enum(['fasttrack', 'fasttrack_plus']),
  gdpr_consent: z.boolean().refine(val => val === true, {
    message: "GDPR consent is required"
  }),
  marketing_consent: z.boolean().default(false)
});

// ===== SUPABASE CLIENT FACTORY =====

export class SupabaseSecurityClient {
  private static instance: SupabaseSecurityClient;
  private supabase: SupabaseClient;
  private serviceRoleClient: SupabaseClient;

  private constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }

    // Client for user operations (with RLS)
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10 // Rate limit realtime events
          }
        }
      }
    );

    // Service role client for system operations (bypasses RLS)
    this.serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  static getInstance(): SupabaseSecurityClient {
    if (!SupabaseSecurityClient.instance) {
      SupabaseSecurityClient.instance = new SupabaseSecurityClient();
    }
    return SupabaseSecurityClient.instance;
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getServiceRoleClient(): SupabaseClient {
    return this.serviceRoleClient;
  }
}

// ===== SECURE OPERATIONS CLASS =====

export class SupabaseSecureOperations {
  private static client = SupabaseSecurityClient.getInstance();
  private static supabase = SupabaseSecureOperations.client.getClient();
  private static serviceClient = SupabaseSecureOperations.client.getServiceRoleClient();

  // ===== WAITLIST APPLICATION OPERATIONS =====

  /**
   * Create a new waitlist application with security validation
   */
  static async createApplication(
    applicationData: any,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; data?: WaitlistApplication; error?: string }> {
    try {
      // Validate and sanitize input data
      const validation = SecurityValidator.validateFormData(applicationData, waitlistApplicationSchema);
      
      if (!validation.success || !validation.data) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Application validation failed: ${validation.errors?.join(', ')}`,
          severity: 'medium'
        });
        return { success: false, error: 'Invalid application data' };
      }

      const validatedData = validation.data;

      // Check for duplicate applications
      const { data: existingApp } = await this.supabase
        .from('waitlist_applications')
        .select('id')
        .eq('email', validatedData.email)
        .eq('is_deleted', false)
        .single();

      if (existingApp) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Duplicate application attempt: ${SecuritySanitizer.sanitizeText(validatedData.email)}`,
          severity: 'medium'
        });
        return { success: false, error: 'Application already exists for this email' };
      }

      // Prepare secure application data
      const applicationInsert = {
        ...validatedData,
        ip_address: context.ip ? this.hashIP(context.ip) : null,
        user_agent_hash: context.userAgent ? this.hashUserAgent(context.userAgent) : null,
        gdpr_consent_date: new Date().toISOString(),
        data_retention_expires_at: new Date(Date.now() + (7 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 7 years
        wave_number: 1 // Default to wave 1
      };

      // Insert application
      const { data, error } = await this.supabase
        .from('waitlist_applications')
        .insert(applicationInsert)
        .select()
        .single();

      if (error) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Application creation failed: ${error.message}`,
          severity: 'high'
        });
        return { success: false, error: 'Failed to create application' };
      }

      // Update seat availability
      await this.updateSeatAvailability(validatedData.wave_type, 1, 1);

      return { success: true, data };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Application creation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return { success: false, error: 'Internal error creating application' };
    }
  }

  /**
   * Get user's application with security checks
   */
  static async getUserApplication(
    email: string,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; data?: WaitlistApplication; error?: string }> {
    try {
      // Sanitize email input
      const sanitizedEmail = SecuritySanitizer.sanitizeText(email, 254);
      
      // Validate email format
      const emailValidation = SecurityValidator.validateFormData(
        { email: sanitizedEmail }, 
        z.object({ email: schemas.email })
      );

      if (!emailValidation.success) {
        return { success: false, error: 'Invalid email format' };
      }

      // Get application with RLS protection
      const { data, error } = await this.supabase
        .from('waitlist_applications')
        .select('*')
        .eq('email', sanitizedEmail)
        .eq('is_deleted', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return { success: false, error: 'Application not found' };
        }
        
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Failed to retrieve application: ${error.message}`,
          severity: 'medium'
        });
        return { success: false, error: 'Failed to retrieve application' };
      }

      return { success: true, data };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Application retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium'
      });
      return { success: false, error: 'Internal error retrieving application' };
    }
  }

  /**
   * Update payment status (system operation)
   */
  static async updatePaymentStatus(
    applicationId: string,
    paymentData: {
      payment_status: 'paid' | 'failed' | 'refunded';
      payment_intent_id?: string;
      stripe_customer_id?: string;
      amount_paid?: number;
    },
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.serviceClient
        .from('waitlist_applications')
        .update({
          ...paymentData,
          paid_at: paymentData.payment_status === 'paid' ? new Date().toISOString() : null,
          status: paymentData.payment_status === 'paid' ? 'under_review' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) {
        SecurityAudit.logSecurityEvent({
          type: 'suspicious_activity',
          ip: context.ip,
          details: `Payment status update failed: ${error.message}`,
          severity: 'high'
        });
        return { success: false, error: 'Failed to update payment status' };
      }

      return { success: true };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        details: `Payment status update error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      });
      return { success: false, error: 'Internal error updating payment' };
    }
  }

  // ===== SEAT AVAILABILITY OPERATIONS =====

  /**
   * Get current seat availability
   */
  static async getSeatAvailability(): Promise<{ success: boolean; data?: SeatAvailability[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('seat_availability')
        .select('*')
        .eq('is_active', true)
        .order('wave_number', { ascending: true })
        .order('wave_type', { ascending: true });

      if (error) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          details: `Failed to retrieve seat availability: ${error.message}`,
          severity: 'medium'
        });
        return { success: false, error: 'Failed to retrieve seat data' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        details: `Seat availability error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium'
      });
      return { success: false, error: 'Internal error retrieving seats' };
    }
  }

  /**
   * Update seat availability (system operation)
   */
  static async updateSeatAvailability(
    waveType: 'fasttrack' | 'fasttrack_plus',
    waveNumber: number,
    increment: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.serviceClient.rpc('increment_filled_seats', {
        p_wave_type: waveType,
        p_wave_number: waveNumber,
        p_increment: increment
      });

      if (error) {
        SecurityAudit.logSecurityEvent({
          type: 'suspicious_activity',
          details: `Failed to update seat availability: ${error.message}`,
          severity: 'high'
        });
        return { success: false, error: 'Failed to update seat availability' };
      }

      return { success: true };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        details: `Seat availability update error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return { success: false, error: 'Internal error updating seats' };
    }
  }

  // ===== ADMIN OPERATIONS =====

  /**
   * Authenticate admin user
   */
  static async authenticateAdmin(userId: string): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { success: false, error: 'Admin not found or inactive' };
      }

      // Check for account lockout
      if (data.account_locked_until && new Date(data.account_locked_until) > new Date()) {
        return { success: false, error: 'Account is temporarily locked' };
      }

      return { success: true, admin: data };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'auth_failure',
        details: `Admin authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return { success: false, error: 'Authentication error' };
    }
  }

  // ===== GDPR COMPLIANCE OPERATIONS =====

  /**
   * Process GDPR deletion request
   */
  static async processGDPRDeletion(
    email: string,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.serviceClient.rpc('gdpr_delete_user_data', {
        user_email: email
      });

      if (error) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `GDPR deletion failed: ${error.message}`,
          severity: 'high'
        });
        return { success: false, error: 'Failed to process deletion request' };
      }

      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `GDPR deletion completed for user: ${this.hashEmail(email)}`,
        severity: 'low'
      });

      return { success: true };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `GDPR deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      });
      return { success: false, error: 'Internal error processing deletion' };
    }
  }

  // ===== UTILITY FUNCTIONS =====

  private static hashIP(ip: string): string {
    return SecuritySanitizer.sanitizeText(ip).substring(0, 8) + '***';
  }

  private static hashUserAgent(userAgent: string): string {
    return SecuritySanitizer.sanitizeText(userAgent).substring(0, 16) + '***';
  }

  private static hashEmail(email: string): string {
    return SecuritySanitizer.sanitizeText(email).substring(0, 8) + '***';
  }
}

// ===== EXPORTED UTILITIES =====

export const supabaseClient = SupabaseSecurityClient.getInstance().getClient();
export const supabaseServiceClient = SupabaseSecurityClient.getInstance().getServiceRoleClient();

const SupabaseSecurity = {
  SupabaseSecureOperations,
  SupabaseSecurityClient,
  supabaseClient,
  supabaseServiceClient,
  waitlistApplicationSchema
};

export default SupabaseSecurity;