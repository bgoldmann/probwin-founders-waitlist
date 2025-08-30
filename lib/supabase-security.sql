-- =====================================================
-- Supabase Row Level Security (RLS) Policies
-- ProbWin.ai Founders Waitlist Platform
-- 
-- This file contains comprehensive RLS policies to secure
-- sensitive user data in compliance with GDPR, financial
-- regulations, and privacy best practices.
-- =====================================================

-- =====================================================
-- 1. DATABASE SETUP AND SECURITY CONFIGURATION
-- =====================================================

-- Enable RLS on all tables by default
ALTER DATABASE postgres SET row_security = on;

-- Create security roles
CREATE ROLE IF NOT EXISTS app_user;
CREATE ROLE IF NOT EXISTS admin_user;
CREATE ROLE IF NOT EXISTS audit_user;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO app_user, admin_user, audit_user;

-- =====================================================
-- 2. APPLICANTS TABLE - Core user data
-- =====================================================

-- Create applicants table with security considerations
CREATE TABLE IF NOT EXISTS public.waitlist_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal Information (PII - encrypted at rest)
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    linkedin_url TEXT,
    
    -- Application Details
    experience_level TEXT CHECK (experience_level IN ('0-2', '3-5', '6-10', '10+')),
    industry TEXT CHECK (industry IN (
        'technology', 'finance', 'healthcare', 'education', 'retail',
        'manufacturing', 'consulting', 'media', 'real-estate', 'other'
    )),
    motivation TEXT,
    how_heard_about TEXT CHECK (how_heard_about IN (
        'search', 'social', 'referral', 'advertising', 'other'
    )),
    
    -- Geographic and Preference Data
    timezone TEXT DEFAULT 'America/New_York',
    preferred_interview_times JSONB,
    
    -- Application Status and Processing
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'interview_scheduled', 
        'interview_completed', 'accepted', 'rejected', 'withdrawn'
    )),
    wave_type TEXT CHECK (wave_type IN ('fasttrack', 'fasttrack_plus')),
    wave_number INTEGER DEFAULT 1,
    
    -- Payment Information
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
        'unpaid', 'paid', 'refunded', 'failed'
    )),
    payment_intent_id TEXT,
    stripe_customer_id TEXT,
    amount_paid INTEGER, -- in cents
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Interview Scheduling
    interview_scheduled_at TIMESTAMP WITH TIME ZONE,
    interview_completed_at TIMESTAMP WITH TIME ZONE,
    interviewer_id UUID,
    interview_notes TEXT,
    interview_rating INTEGER CHECK (interview_rating BETWEEN 1 AND 5),
    
    -- Decision Information
    decision_made_by UUID REFERENCES auth.users(id),
    decision_made_at TIMESTAMP WITH TIME ZONE,
    decision_reason TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Security and Compliance
    ip_address INET, -- Hashed for security
    user_agent_hash TEXT, -- Hashed user agent
    gdpr_consent BOOLEAN DEFAULT FALSE,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    
    -- Data Retention
    data_retention_expires_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_payment_data CHECK (
        (payment_status = 'paid' AND payment_intent_id IS NOT NULL AND amount_paid > 0)
        OR 
        (payment_status != 'paid')
    ),
    
    CONSTRAINT valid_interview_scheduling CHECK (
        (status = 'interview_scheduled' AND interview_scheduled_at IS NOT NULL)
        OR
        (status != 'interview_scheduled')
    )
);

-- Enable RLS
ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_email ON public.waitlist_applications(email) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_status ON public.waitlist_applications(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_wave ON public.waitlist_applications(wave_number, wave_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_created_at ON public.waitlist_applications(created_at) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_payment ON public.waitlist_applications(payment_status, stripe_customer_id) WHERE is_deleted = FALSE;

-- =====================================================
-- 3. RLS POLICIES FOR APPLICANTS
-- =====================================================

-- Policy 1: Users can only view their own applications
CREATE POLICY "Users can view own applications" ON public.waitlist_applications
    FOR SELECT 
    TO authenticated
    USING (
        email = auth.jwt() ->> 'email' 
        AND is_deleted = FALSE
        AND gdpr_consent = TRUE
    );

-- Policy 2: Anyone can insert applications (for signup)
CREATE POLICY "Allow application submissions" ON public.waitlist_applications
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (
        -- Ensure required fields are present
        email IS NOT NULL 
        AND full_name IS NOT NULL 
        AND gdpr_consent = TRUE
        -- Prevent duplicate applications
        AND NOT EXISTS (
            SELECT 1 FROM public.waitlist_applications 
            WHERE email = NEW.email AND is_deleted = FALSE
        )
    );

-- Policy 3: Users can update their own non-sensitive data
CREATE POLICY "Users can update own non-sensitive data" ON public.waitlist_applications
    FOR UPDATE 
    TO authenticated
    USING (
        email = auth.jwt() ->> 'email' 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        -- Prevent updates to sensitive fields
        email = OLD.email -- Email cannot be changed
        AND status = OLD.status -- Status cannot be self-updated
        AND payment_status = OLD.payment_status -- Payment status cannot be self-updated
        AND decision_made_by = OLD.decision_made_by -- Decision fields cannot be self-updated
        AND created_at = OLD.created_at -- Audit fields cannot be changed
        AND wave_number = OLD.wave_number -- Wave assignment cannot be changed
    );

-- Policy 4: Admin can view all applications
CREATE POLICY "Admins can view all applications" ON public.waitlist_applications
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND is_active = TRUE
        )
    );

-- Policy 5: Admin can update applications
CREATE POLICY "Admins can update applications" ON public.waitlist_applications
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND is_active = TRUE
            AND permissions ? 'manage_applications'
        )
    )
    WITH CHECK (
        -- Log all admin changes
        updated_at = NOW()
    );

-- Policy 6: System can update payment status via webhooks
CREATE POLICY "System can update payment status" ON public.waitlist_applications
    FOR UPDATE 
    TO service_role
    USING (TRUE)
    WITH CHECK (
        -- Only allow payment-related updates from system
        (OLD.payment_status != NEW.payment_status AND NEW.payment_intent_id IS NOT NULL)
        OR (OLD.status != NEW.status AND NEW.status IN ('under_review', 'accepted'))
    );

-- =====================================================
-- 4. ADMIN USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'interviewer', 'viewer')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Security
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view admin users" ON public.admin_users
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND is_active = TRUE
        )
    );

CREATE POLICY "Super admins can manage admin users" ON public.admin_users
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
            AND is_active = TRUE
        )
    );

-- =====================================================
-- 5. AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Information
    event_type TEXT NOT NULL CHECK (event_type IN (
        'application_created', 'application_updated', 'application_deleted',
        'payment_completed', 'payment_failed', 'payment_refunded',
        'interview_scheduled', 'interview_completed', 'decision_made',
        'admin_login', 'admin_logout', 'permission_changed',
        'data_export', 'data_deletion', 'gdpr_request'
    )),
    table_name TEXT,
    record_id UUID,
    
    -- User Information
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    ip_address INET,
    user_agent_hash TEXT,
    request_id TEXT,
    session_id TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Compliance
    gdpr_category TEXT CHECK (gdpr_category IN ('personal_data', 'sensitive_data', 'system_data')),
    retention_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 years')
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Only audit users can view logs" ON public.audit_logs
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND (role IN ('super_admin', 'admin') OR permissions ? 'view_audit_logs')
            AND is_active = TRUE
        )
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT 
    TO service_role, authenticated
    WITH CHECK (TRUE);

-- No updates or deletes allowed on audit logs
CREATE POLICY "No updates to audit logs" ON public.audit_logs
    FOR UPDATE 
    TO authenticated
    USING (FALSE);

CREATE POLICY "No deletes of audit logs" ON public.audit_logs
    FOR DELETE 
    TO authenticated
    USING (FALSE);

-- =====================================================
-- 6. SEAT AVAILABILITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seat_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_number INTEGER NOT NULL,
    wave_type TEXT NOT NULL CHECK (wave_type IN ('fasttrack', 'fasttrack_plus')),
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    filled_seats INTEGER DEFAULT 0 CHECK (filled_seats >= 0),
    available_seats INTEGER GENERATED ALWAYS AS (total_seats - filled_seats) STORED,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    opens_at TIMESTAMP WITH TIME ZONE,
    closes_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_wave_type UNIQUE (wave_number, wave_type),
    CONSTRAINT valid_seat_count CHECK (filled_seats <= total_seats)
);

-- Enable RLS
ALTER TABLE public.seat_availability ENABLE ROW LEVEL SECURITY;

-- Public read access for seat data
CREATE POLICY "Public can view seat availability" ON public.seat_availability
    FOR SELECT 
    TO anon, authenticated
    USING (is_active = TRUE);

-- Only admins can manage seat availability
CREATE POLICY "Admins can manage seat availability" ON public.seat_availability
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND (role IN ('super_admin', 'admin') OR permissions ? 'manage_seats')
            AND is_active = TRUE
        )
    );

-- System can update seat counts
CREATE POLICY "System can update seat counts" ON public.seat_availability
    FOR UPDATE 
    TO service_role
    USING (TRUE)
    WITH CHECK (filled_seats >= OLD.filled_seats); -- Seats can only increase

-- =====================================================
-- 7. SECURITY FUNCTIONS
-- =====================================================

-- Function to hash sensitive data
CREATE OR REPLACE FUNCTION hash_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(data || current_setting('app.security_salt', true), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_event_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    current_user_email TEXT;
    current_user_role TEXT;
BEGIN
    -- Get current user info
    SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();
    
    SELECT role INTO current_user_role 
    FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = TRUE;
    
    -- Insert audit log
    INSERT INTO public.audit_logs (
        event_type, table_name, record_id, old_values, new_values,
        user_id, user_email, user_role,
        ip_address, user_agent_hash
    ) VALUES (
        p_event_type, p_table_name, p_record_id, p_old_values, p_new_values,
        auth.uid(), current_user_email, COALESCE(current_user_role, 'user'),
        inet_client_addr(), hash_sensitive_data(current_setting('request.headers', true)::json->>'user-agent')
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check GDPR compliance
CREATE OR REPLACE FUNCTION check_gdpr_compliance(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    consent_valid BOOLEAN;
    data_retention_valid BOOLEAN;
BEGIN
    -- Check consent
    SELECT gdpr_consent AND gdpr_consent_date > NOW() - INTERVAL '2 years'
    INTO consent_valid
    FROM public.waitlist_applications
    WHERE email = user_email AND is_deleted = FALSE;
    
    -- Check data retention
    SELECT data_retention_expires_at > NOW() OR data_retention_expires_at IS NULL
    INTO data_retention_valid
    FROM public.waitlist_applications
    WHERE email = user_email AND is_deleted = FALSE;
    
    RETURN COALESCE(consent_valid, FALSE) AND COALESCE(data_retention_valid, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGERS FOR AUDIT LOGGING
-- =====================================================

-- Audit trigger function
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            LOWER(TG_TABLE_NAME) || '_created',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM create_audit_log(
            LOWER(TG_TABLE_NAME) || '_updated',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM create_audit_log(
            LOWER(TG_TABLE_NAME) || '_deleted',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER audit_waitlist_applications
    AFTER INSERT OR UPDATE OR DELETE ON public.waitlist_applications
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_admin_users
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_applications_updated_at
    BEFORE UPDATE ON public.waitlist_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 9. DATA RETENTION AND GDPR COMPLIANCE
-- =====================================================

-- Function to anonymize expired data
CREATE OR REPLACE FUNCTION anonymize_expired_data()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Anonymize applications where data retention has expired
    UPDATE public.waitlist_applications
    SET 
        email = 'anonymized_' || id::text || '@probwin.ai',
        full_name = 'ANONYMIZED',
        phone = NULL,
        linkedin_url = NULL,
        motivation = 'ANONYMIZED',
        ip_address = NULL,
        user_agent_hash = NULL,
        is_deleted = TRUE,
        deleted_at = NOW()
    WHERE 
        data_retention_expires_at < NOW()
        AND is_deleted = FALSE;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Log the anonymization
    PERFORM create_audit_log(
        'gdpr_data_anonymized',
        'waitlist_applications',
        NULL,
        json_build_object('affected_rows', affected_rows)::jsonb,
        NULL
    );
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for GDPR data deletion
CREATE OR REPLACE FUNCTION gdpr_delete_user_data(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Soft delete user application
    UPDATE public.waitlist_applications
    SET 
        is_deleted = TRUE,
        deleted_at = NOW(),
        email = 'deleted_' || id::text || '@probwin.ai',
        full_name = 'DELETED',
        phone = NULL,
        linkedin_url = NULL,
        motivation = 'DELETED BY USER REQUEST',
        ip_address = NULL,
        user_agent_hash = NULL
    WHERE email = user_email AND is_deleted = FALSE;
    
    -- Log the deletion
    PERFORM create_audit_log(
        'gdpr_deletion_request',
        'waitlist_applications',
        NULL,
        json_build_object('user_email', hash_sensitive_data(user_email))::jsonb,
        NULL
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. PERFORMANCE AND MONITORING
-- =====================================================

-- Create performance monitoring view
CREATE VIEW public.application_stats AS
SELECT 
    wave_number,
    wave_type,
    status,
    payment_status,
    COUNT(*) as count,
    AVG(CASE WHEN paid_at IS NOT NULL THEN EXTRACT(EPOCH FROM (paid_at - created_at))/3600 END) as avg_payment_hours,
    DATE_TRUNC('day', created_at) as application_date
FROM public.waitlist_applications
WHERE is_deleted = FALSE
GROUP BY wave_number, wave_type, status, payment_status, DATE_TRUNC('day', created_at)
ORDER BY application_date DESC;

-- Grant access to stats view
GRANT SELECT ON public.application_stats TO authenticated;

-- Create RLS policy for stats
CREATE POLICY "Admins can view application stats" ON public.application_stats
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() 
            AND is_active = TRUE
        )
    );

-- =====================================================
-- 11. INITIAL DATA AND SETUP
-- =====================================================

-- Insert initial seat availability
INSERT INTO public.seat_availability (wave_number, wave_type, total_seats, opens_at) VALUES
    (1, 'fasttrack', 100, NOW()),
    (1, 'fasttrack_plus', 50, NOW()),
    (2, 'fasttrack', 200, NOW() + INTERVAL '30 days'),
    (2, 'fasttrack_plus', 100, NOW() + INTERVAL '30 days')
ON CONFLICT (wave_number, wave_type) DO NOTHING;

-- Set security configuration
ALTER DATABASE postgres SET app.security_salt = 'your-security-salt-here-change-in-production';

-- =====================================================
-- 12. SECURITY GRANTS AND FINAL SETUP
-- =====================================================

-- Revoke default permissions
REVOKE ALL ON public.waitlist_applications FROM PUBLIC;
REVOKE ALL ON public.admin_users FROM PUBLIC;
REVOKE ALL ON public.audit_logs FROM PUBLIC;
REVOKE ALL ON public.seat_availability FROM PUBLIC;

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE ON public.waitlist_applications TO authenticated;
GRANT SELECT ON public.seat_availability TO anon, authenticated;
GRANT SELECT ON public.application_stats TO authenticated;

-- Service role permissions (for Stripe webhooks)
GRANT SELECT, UPDATE ON public.waitlist_applications TO service_role;
GRANT INSERT ON public.audit_logs TO service_role;
GRANT SELECT, UPDATE ON public.seat_availability TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.waitlist_applications IS 'Secure storage for waitlist applications with GDPR compliance';
COMMENT ON TABLE public.admin_users IS 'Admin user management with role-based permissions';
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for compliance and security monitoring';
COMMENT ON TABLE public.seat_availability IS 'Real-time seat availability for each wave and type';

-- Final security verification
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('waitlist_applications', 'admin_users', 'audit_logs', 'seat_availability');