-- Row Level Security (RLS) policies for ProbWin.ai waitlist
-- Based on Research-Analysis.md security specifications

-- Enable RLS on all tables
ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "service_role_all_access_applications" ON public.waitlist_applications;
DROP POLICY IF EXISTS "public_no_access_applications" ON public.waitlist_applications;
DROP POLICY IF EXISTS "admin_full_access_applications" ON public.waitlist_applications;

DROP POLICY IF EXISTS "service_role_all_access_free" ON public.free_waitlist;
DROP POLICY IF EXISTS "public_no_access_free" ON public.free_waitlist;

DROP POLICY IF EXISTS "public_read_waves" ON public.waves;
DROP POLICY IF EXISTS "admin_manage_waves" ON public.waves;
DROP POLICY IF EXISTS "service_role_all_access_waves" ON public.waves;

DROP POLICY IF EXISTS "service_role_all_access_audit" ON public.security_audit_log;
DROP POLICY IF EXISTS "admin_read_audit" ON public.security_audit_log;
DROP POLICY IF EXISTS "public_no_access_audit" ON public.security_audit_log;

-- ========================================
-- Waitlist Applications Policies
-- ========================================

-- Service role has full access (for API operations)
CREATE POLICY "service_role_all_access_applications" 
ON public.waitlist_applications
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Public users have no direct access
CREATE POLICY "public_no_access_applications" 
ON public.waitlist_applications
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

-- Authenticated users have no direct access (use service role)
CREATE POLICY "authenticated_no_access_applications" 
ON public.waitlist_applications
FOR ALL 
TO authenticated 
USING (false) 
WITH CHECK (false);

-- ========================================
-- Free Waitlist Policies
-- ========================================

-- Service role has full access
CREATE POLICY "service_role_all_access_free" 
ON public.free_waitlist
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Public users have no direct access
CREATE POLICY "public_no_access_free" 
ON public.free_waitlist
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

-- Authenticated users have no direct access
CREATE POLICY "authenticated_no_access_free" 
ON public.free_waitlist
FOR ALL 
TO authenticated 
USING (false) 
WITH CHECK (false);

-- ========================================
-- Waves Policies (Public Read for Seat Counts)
-- ========================================

-- Public can read wave information (for seat counters)
CREATE POLICY "public_read_waves" 
ON public.waves
FOR SELECT 
TO anon, authenticated 
USING (status IN ('open', 'full'));

-- Service role has full access
CREATE POLICY "service_role_all_access_waves" 
ON public.waves
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ========================================
-- Security Audit Log Policies
-- ========================================

-- Service role has full access (for logging)
CREATE POLICY "service_role_all_access_audit" 
ON public.security_audit_log
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Public users have no access
CREATE POLICY "public_no_access_audit" 
ON public.security_audit_log
FOR ALL 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

-- ========================================
-- Additional Security Functions
-- ========================================

-- Function to validate admin access (for future admin features)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, return false. Will be updated when admin auth is implemented
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events safely
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type TEXT,
    p_user_identifier TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Validate severity
    IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
        p_severity := 'medium';
    END IF;
    
    -- Insert security log entry
    INSERT INTO public.security_audit_log (
        event_type,
        user_identifier,
        ip_address,
        user_agent,
        event_data,
        severity
    ) VALUES (
        p_event_type,
        p_user_identifier,
        p_ip_address,
        p_user_agent,
        p_event_data,
        p_severity
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get public seat availability (used by API)
CREATE OR REPLACE FUNCTION public.get_public_seat_counts()
RETURNS TABLE(
    wave INTEGER,
    tier TEXT,
    total_seats INTEGER,
    filled_seats BIGINT,
    available_seats INTEGER,
    fill_percentage NUMERIC,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    -- Refresh the materialized view first
    PERFORM public.refresh_seat_counts();
    
    -- Return the current seat counts
    RETURN QUERY
    SELECT 
        v.wave,
        v.tier::TEXT,
        v.total_seats,
        v.filled_seats,
        v.available_seats,
        v.fill_percentage,
        v.last_updated
    FROM public.v_seat_counts v
    ORDER BY v.wave;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.waves TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_seat_counts() TO anon, authenticated;

-- Grant service role access to all tables and functions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comment on policies for documentation
COMMENT ON POLICY "service_role_all_access_applications" ON public.waitlist_applications IS 
'Service role has full access to applications for API operations';

COMMENT ON POLICY "public_read_waves" ON public.waves IS 
'Public can read wave information for real-time seat counters';

COMMENT ON FUNCTION public.get_public_seat_counts() IS 
'Returns current seat availability for all waves - used by public API endpoint';