/**
 * GDPR Compliance Utilities for ProbWin.ai
 * Implements comprehensive GDPR compliance including data subject rights,
 * consent management, and privacy controls
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import { SupabaseSecureOperations, supabaseServiceClient } from '@/lib/supabase-security';
import { SecurityAudit, SecurityValidator, schemas } from '@/lib/security';

// ===== GDPR CONSTANTS =====

export const GDPR_CONSTANTS = {
  // Data retention periods (in months)
  RETENTION_PERIODS: {
    APPLICATION_DATA: 84, // 7 years for financial compliance
    MARKETING_DATA: 36, // 3 years for marketing data
    AUDIT_LOGS: 84, // 7 years for audit compliance
    CONSENT_RECORDS: 84, // 7 years for consent records
  },
  
  // Consent types
  CONSENT_TYPES: {
    PROCESSING: 'data_processing',
    MARKETING: 'marketing_communications',
    ANALYTICS: 'analytics_tracking',
    THIRD_PARTY: 'third_party_sharing',
  },
  
  // Data categories under GDPR
  DATA_CATEGORIES: {
    PERSONAL: 'personal_identifiable',
    SENSITIVE: 'sensitive_personal',
    FINANCIAL: 'financial_information',
    BEHAVIORAL: 'behavioral_tracking',
    TECHNICAL: 'technical_metadata',
  },
  
  // Legal bases for processing
  LEGAL_BASES: {
    CONSENT: 'consent',
    CONTRACT: 'contract_performance',
    LEGAL_OBLIGATION: 'legal_obligation',
    VITAL_INTERESTS: 'vital_interests',
    PUBLIC_TASK: 'public_task',
    LEGITIMATE_INTERESTS: 'legitimate_interests',
  }
} as const;

// ===== VALIDATION SCHEMAS =====

const consentSchema = z.object({
  email: schemas.email,
  consentTypes: z.array(z.enum([
    'data_processing',
    'marketing_communications', 
    'analytics_tracking',
    'third_party_sharing'
  ])),
  consentGiven: z.boolean(),
  consentDate: z.string().datetime(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const dataSubjectRequestSchema = z.object({
  email: schemas.email,
  requestType: z.enum([
    'access', // Right to access
    'rectification', // Right to rectification
    'erasure', // Right to be forgotten
    'portability', // Right to data portability
    'restriction', // Right to restrict processing
    'objection', // Right to object
    'withdraw_consent' // Right to withdraw consent
  ]),
  details: z.string().max(1000).optional(),
  verificationCode: z.string().optional(),
});

const privacyNoticeSchema = z.object({
  version: z.string(),
  effectiveDate: z.string().datetime(),
  content: z.string(),
  language: z.enum(['en', 'es', 'fr', 'de']).default('en'),
});

// ===== GDPR COMPLIANCE CLASS =====

export class GDPRCompliance {
  
  // ===== CONSENT MANAGEMENT =====
  
  /**
   * Record user consent with audit trail
   */
  static async recordConsent(
    consentData: any,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; consentId?: string; error?: string }> {
    try {
      const validation = SecurityValidator.validateFormData(consentData, consentSchema);
      
      if (!validation.success || !validation.data) {
        return { 
          success: false, 
          error: `Consent validation failed: ${validation.errors?.join(', ')}` 
        };
      }

      const { email, consentTypes, consentGiven, consentDate } = validation.data;

      // Create consent record
      const consentRecord = {
        id: crypto.randomUUID(),
        email: email,
        consent_types: consentTypes,
        consent_given: consentGiven,
        consent_date: consentDate,
        ip_address: context.ip ? this.hashPII(context.ip) : null,
        user_agent_hash: context.userAgent ? this.hashPII(context.userAgent) : null,
        legal_basis: GDPR_CONSTANTS.LEGAL_BASES.CONSENT,
        withdrawal_date: null,
        is_active: consentGiven,
        created_at: new Date().toISOString(),
      };

      // Insert consent record
      const { error } = await supabaseServiceClient
        .from('gdpr_consent_records')
        .insert(consentRecord);

      if (error) {
        SecurityAudit.logSecurityEvent({
          type: 'validation_error',
          ip: context.ip,
          userAgent: context.userAgent,
          details: `Failed to record consent: ${error.message}`,
          severity: 'high'
        });
        return { success: false, error: 'Failed to record consent' };
      }

      // Update user application with consent status
      await supabaseServiceClient
        .from('waitlist_applications')
        .update({
          gdpr_consent: consentGiven,
          gdpr_consent_date: consentDate,
          marketing_consent: consentTypes.includes('marketing_communications'),
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      // Log consent activity
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Consent ${consentGiven ? 'granted' : 'withdrawn'} for: ${consentTypes.join(', ')}`,
        severity: 'low'
      });

      return { success: true, consentId: consentRecord.id };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Consent recording error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return { success: false, error: 'Internal error recording consent' };
    }
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(
    email: string,
    consentTypes: string[],
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const withdrawalDate = new Date().toISOString();

      // Update consent records
      const { error } = await supabaseServiceClient
        .from('gdpr_consent_records')
        .update({
          is_active: false,
          withdrawal_date: withdrawalDate,
          updated_at: withdrawalDate
        })
        .eq('email', email)
        .in('consent_types', consentTypes)
        .eq('is_active', true);

      if (error) {
        return { success: false, error: 'Failed to withdraw consent' };
      }

      // Update application record
      await supabaseServiceClient
        .from('waitlist_applications')
        .update({
          marketing_consent: false,
          updated_at: withdrawalDate
        })
        .eq('email', email);

      // Log withdrawal
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Consent withdrawn for: ${consentTypes.join(', ')}`,
        severity: 'low'
      });

      return { success: true };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Consent withdrawal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return { success: false, error: 'Internal error withdrawing consent' };
    }
  }

  // ===== DATA SUBJECT RIGHTS =====

  /**
   * Process data subject access request (Right to Access)
   */
  static async processAccessRequest(
    email: string,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Verify user identity first
      const identityVerified = await this.verifyDataSubjectIdentity(email);
      if (!identityVerified) {
        return { success: false, error: 'Identity verification required' };
      }

      // Collect all data associated with the email
      const userData = await this.collectUserData(email);

      if (!userData.success) {
        return { success: false, error: 'Failed to retrieve user data' };
      }

      // Log access request
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Data access request processed for user`,
        severity: 'low'
      });

      return { success: true, data: userData.data };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Access request error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium'
      });
      return { success: false, error: 'Internal error processing access request' };
    }
  }

  /**
   * Process data portability request (Right to Data Portability)
   */
  static async processPortabilityRequest(
    email: string,
    format: 'json' | 'csv' | 'xml' = 'json',
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const identityVerified = await this.verifyDataSubjectIdentity(email);
      if (!identityVerified) {
        return { success: false, error: 'Identity verification required' };
      }

      const userData = await this.collectUserData(email);
      if (!userData.success) {
        return { success: false, error: 'Failed to retrieve user data' };
      }

      // Format data according to requested format
      let formattedData: string;
      switch (format) {
        case 'json':
          formattedData = JSON.stringify(userData.data, null, 2);
          break;
        case 'csv':
          formattedData = this.convertToCSV(userData.data);
          break;
        case 'xml':
          formattedData = this.convertToXML(userData.data);
          break;
        default:
          formattedData = JSON.stringify(userData.data, null, 2);
      }

      // Log portability request
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Data portability request processed in ${format} format`,
        severity: 'low'
      });

      return { success: true, data: formattedData };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Portability request error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium'
      });
      return { success: false, error: 'Internal error processing portability request' };
    }
  }

  /**
   * Process erasure request (Right to be Forgotten)
   */
  static async processErasureRequest(
    email: string,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const identityVerified = await this.verifyDataSubjectIdentity(email);
      if (!identityVerified) {
        return { success: false, error: 'Identity verification required' };
      }

      // Check if we can legally erase the data
      const canErase = await this.checkErasureConditions(email);
      if (!canErase.allowed) {
        return { success: false, error: canErase.reason };
      }

      // Process erasure using Supabase function
      const result = await SupabaseSecureOperations.processGDPRDeletion(email, context);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Log erasure request
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity', // Using for audit logging
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Data erasure request completed`,
        severity: 'low'
      });

      return { success: true };
    } catch (error) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip: context.ip,
        userAgent: context.userAgent,
        details: `Erasure request error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
      return { success: false, error: 'Internal error processing erasure request' };
    }
  }

  // ===== DATA COLLECTION AND MANAGEMENT =====

  /**
   * Collect all user data for GDPR requests
   */
  private static async collectUserData(email: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const data: any = {
        personalData: {},
        consentRecords: [],
        activityLogs: [],
        metadata: {
          collectedAt: new Date().toISOString(),
          dataCategories: [],
          retentionPeriods: GDPR_CONSTANTS.RETENTION_PERIODS,
        }
      };

      // Get application data
      const { data: application } = await supabaseServiceClient
        .from('waitlist_applications')
        .select('*')
        .eq('email', email)
        .eq('is_deleted', false)
        .single();

      if (application) {
        data.personalData = {
          id: application.id,
          email: application.email,
          full_name: application.full_name,
          phone: application.phone,
          company: application.company,
          linkedin_url: application.linkedin_url,
          experience_level: application.experience_level,
          industry: application.industry,
          motivation: application.motivation,
          how_heard_about: application.how_heard_about,
          timezone: application.timezone,
          status: application.status,
          wave_type: application.wave_type,
          wave_number: application.wave_number,
          payment_status: application.payment_status,
          created_at: application.created_at,
          updated_at: application.updated_at,
        };
        data.metadata.dataCategories.push(GDPR_CONSTANTS.DATA_CATEGORIES.PERSONAL);
      }

      // Get consent records
      const { data: consents } = await supabaseServiceClient
        .from('gdpr_consent_records')
        .select('*')
        .eq('email', email);

      if (consents && consents.length > 0) {
        data.consentRecords = consents.map(consent => ({
          consentTypes: consent.consent_types,
          consentGiven: consent.consent_given,
          consentDate: consent.consent_date,
          withdrawalDate: consent.withdrawal_date,
          isActive: consent.is_active,
        }));
      }

      // Get relevant audit logs (anonymized)
      const { data: auditLogs } = await supabaseServiceClient
        .from('audit_logs')
        .select('event_type, created_at, severity')
        .eq('user_email', email)
        .limit(100)
        .order('created_at', { ascending: false });

      if (auditLogs && auditLogs.length > 0) {
        data.activityLogs = auditLogs;
        data.metadata.dataCategories.push(GDPR_CONSTANTS.DATA_CATEGORIES.TECHNICAL);
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to collect user data' };
    }
  }

  /**
   * Check if data can be erased under GDPR
   */
  private static async checkErasureConditions(email: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get application status
      const { data: application } = await supabaseServiceClient
        .from('waitlist_applications')
        .select('payment_status, status, created_at')
        .eq('email', email)
        .single();

      if (!application) {
        return { allowed: true }; // No data to erase
      }

      // Check if there are financial obligations
      if (application.payment_status === 'paid') {
        return { 
          allowed: false, 
          reason: 'Cannot erase data due to financial compliance requirements. Data will be anonymized after retention period.' 
        };
      }

      // Check if there are ongoing legal proceedings
      if (application.status === 'under_review' || application.status === 'interview_scheduled') {
        return { 
          allowed: false, 
          reason: 'Cannot erase data while application is under active review. Please contact support.' 
        };
      }

      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: 'Unable to verify erasure conditions' };
    }
  }

  /**
   * Verify data subject identity (simplified - would need stronger verification in production)
   */
  private static async verifyDataSubjectIdentity(email: string): Promise<boolean> {
    try {
      // Check if email exists in our system
      const { data } = await supabaseServiceClient
        .from('waitlist_applications')
        .select('id')
        .eq('email', email)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // ===== DATA FORMAT CONVERSION =====

  private static convertToCSV(data: any): string {
    const flattenObject = (obj: any, prefix = ''): any => {
      return Object.keys(obj).reduce((acc: any, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(acc, flattenObject(obj[key], pre + key));
        } else {
          acc[pre + key] = obj[key];
        }
        return acc;
      }, {});
    };

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened).join(',');
    const values = Object.values(flattened).map(v => 
      typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
    ).join(',');

    return `${headers}\n${values}`;
  }

  private static convertToXML(data: any): string {
    const buildXML = (obj: any, rootName = 'data'): string => {
      let xml = `<${rootName}>`;
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          xml += buildXML(value, key);
        } else if (Array.isArray(value)) {
          xml += `<${key}>`;
          value.forEach((item, index) => {
            xml += buildXML(item, `item_${index}`);
          });
          xml += `</${key}>`;
        } else {
          xml += `<${key}>${value}</${key}>`;
        }
      }
      xml += `</${rootName}>`;
      return xml;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n${buildXML(data, 'user_data')}`;
  }

  // ===== UTILITY METHODS =====

  /**
   * Hash PII data for logging and audit purposes
   */
  private static hashPII(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 8) + '***';
  }

  /**
   * Check if user has valid consent for specific processing
   */
  static async hasValidConsent(
    email: string, 
    consentType: string
  ): Promise<boolean> {
    try {
      const { data } = await supabaseServiceClient
        .from('gdpr_consent_records')
        .select('consent_given, consent_date')
        .eq('email', email)
        .contains('consent_types', [consentType])
        .eq('is_active', true)
        .single();

      if (!data || !data.consent_given) {
        return false;
      }

      // Check if consent is still valid (within 2 years)
      const consentDate = new Date(data.consent_date);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      return consentDate > twoYearsAgo;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get privacy notice for user
   */
  static getPrivacyNotice(language: 'en' | 'es' | 'fr' | 'de' = 'en'): string {
    const notices = {
      en: `
# Privacy Notice - ProbWin.ai Founders Waitlist

## Data Controller
ProbWin.ai, LLC

## Data We Collect
- Personal identification information (name, email, phone)
- Professional information (company, LinkedIn profile)
- Application details (experience, industry, motivation)
- Payment information (processed by Stripe)
- Technical data (IP address, browser information)

## Legal Basis for Processing
- Consent for marketing communications
- Contract performance for application processing
- Legitimate interests for improving our services

## Your Rights Under GDPR
- Right to access your data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to restrict processing
- Right to object to processing
- Right to withdraw consent

## Data Retention
We retain your data for 7 years for financial compliance or until you request deletion.

## Contact Information
For privacy-related inquiries: privacy@probwin.ai

Last updated: ${new Date().toISOString().split('T')[0]}
      `.trim(),
      // Add other languages as needed
      es: 'Spanish privacy notice...',
      fr: 'French privacy notice...',
      de: 'German privacy notice...',
    };

    return notices[language];
  }
}

export default GDPRCompliance;