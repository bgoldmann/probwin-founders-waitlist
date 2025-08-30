-- Initial schema for ProbWin.ai founders waitlist
-- Based on Research-Analysis.md specifications

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waitlist_tier') THEN
        CREATE TYPE waitlist_tier AS ENUM ('99', '199');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waitlist_status') THEN
        CREATE TYPE waitlist_status AS ENUM (
            'pending', 
            'interviewed', 
            'accepted', 
            'rejected', 
            'refunded', 
            'activated', 
            'expired', 
            'deferred'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wave_status') THEN
        CREATE TYPE wave_status AS ENUM ('upcoming', 'open', 'closed', 'full');
    END IF;
END $$;

-- Main waitlist applications table
CREATE TABLE IF NOT EXISTS public.waitlist_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Application details
    tier waitlist_tier NOT NULL,
    wave INTEGER NOT NULL CHECK (wave > 0),
    status waitlist_status NOT NULL DEFAULT 'pending',
    
    -- Personal information
    full_name TEXT NOT NULL CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
    country VARCHAR(2) CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    
    -- Application data
    bankroll_range TEXT,
    sportsbooks TEXT[],
    risk_profile JSONB,
    time_commitment TEXT,
    experience_level TEXT,
    notes TEXT CHECK (length(notes) <= 500),
    
    -- Stripe integration
    stripe_customer_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT UNIQUE,
    credit_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (credit_amount_cents >= 0),
    
    -- Interview & decision tracking
    interview_scheduled_at TIMESTAMPTZ,
    interview_completed_at TIMESTAMPTZ,
    decision_made_at TIMESTAMPTZ,
    decision_made_by UUID,
    activation_deadline TIMESTAMPTZ,
    deferred_until TIMESTAMPTZ,
    
    -- Security & fraud prevention
    ip_address INET,
    user_agent TEXT,
    hcaptcha_score NUMERIC(3,2),
    fraud_score NUMERIC(3,2),
    
    -- Constraints
    CONSTRAINT valid_tier_amount CHECK (
        (tier = '99' AND credit_amount_cents = 9900) OR
        (tier = '199' AND credit_amount_cents = 19900) OR
        credit_amount_cents = 0
    ),
    CONSTRAINT unique_email_per_wave UNIQUE (email, wave),
    CONSTRAINT valid_status_transitions CHECK (
        (status = 'pending') OR
        (status = 'interviewed' AND interview_completed_at IS NOT NULL) OR
        (status IN ('accepted', 'rejected') AND decision_made_at IS NOT NULL) OR
        (status = 'refunded') OR
        (status = 'activated') OR
        (status = 'expired') OR
        (status = 'deferred' AND deferred_until IS NOT NULL)
    )
);

-- Free waitlist table
CREATE TABLE IF NOT EXISTS public.free_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    full_name TEXT NOT NULL CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
    email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    country VARCHAR(2) CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    converted_to_paid_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    ip_address INET,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

-- Waves configuration table
CREATE TABLE IF NOT EXISTS public.waves (
    id INTEGER PRIMARY KEY,
    tier waitlist_tier NOT NULL,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    status wave_status NOT NULL DEFAULT 'upcoming',
    opens_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_wave_dates CHECK (
        opens_at IS NULL OR closes_at IS NULL OR opens_at < closes_at
    )
);

-- Security audit log
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_identifier TEXT,
    ip_address INET,
    user_agent TEXT,
    event_data JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial wave configuration
INSERT INTO public.waves (id, tier, total_seats, status) VALUES 
    (1, '99', 100, 'open'),
    (2, '199', 500, 'open')
ON CONFLICT (id) DO NOTHING;

-- Create materialized view for seat counts
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_seat_counts AS
WITH wave_counts AS (
    SELECT 
        w.id AS wave,
        w.tier,
        w.total_seats,
        w.status AS wave_status,
        COUNT(DISTINCT a.id) FILTER (
            WHERE a.status NOT IN ('rejected', 'refunded', 'expired')
        ) AS filled_seats
    FROM public.waves w
    LEFT JOIN public.waitlist_applications a ON w.id = a.wave
    GROUP BY w.id, w.tier, w.total_seats, w.status
)
SELECT 
    wave,
    tier,
    total_seats,
    filled_seats,
    total_seats - filled_seats AS available_seats,
    CASE 
        WHEN total_seats > 0 THEN ROUND((filled_seats::NUMERIC / total_seats) * 100, 2)
        ELSE 0 
    END AS fill_percentage,
    NOW() AS last_updated
FROM wave_counts;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_wave_status 
ON public.waitlist_applications(wave, status);

CREATE INDEX IF NOT EXISTS idx_applications_email 
ON public.waitlist_applications(email);

CREATE INDEX IF NOT EXISTS idx_applications_stripe_customer 
ON public.waitlist_applications(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_created_at 
ON public.waitlist_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status_deadline 
ON public.waitlist_applications(status, activation_deadline) 
WHERE status = 'accepted' AND activation_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_free_waitlist_email 
ON public.free_waitlist(email);

CREATE INDEX IF NOT EXISTS idx_security_audit_created_at 
ON public.security_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_severity 
ON public.security_audit_log(severity, created_at DESC);

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_v_seat_counts_wave 
ON public.v_seat_counts(wave);

-- Function to refresh seat counts
CREATE OR REPLACE FUNCTION public.refresh_seat_counts()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_seat_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER update_waitlist_applications_updated_at
    BEFORE UPDATE ON public.waitlist_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to refresh seat counts on application changes
CREATE OR REPLACE FUNCTION public.trigger_refresh_seats()
RETURNS TRIGGER AS $$
BEGIN
    -- Use pg_notify for async refresh to avoid blocking
    PERFORM pg_notify('refresh_seat_counts', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER refresh_seats_on_application_change
    AFTER INSERT OR UPDATE OR DELETE ON public.waitlist_applications
    FOR EACH STATEMENT 
    EXECUTE FUNCTION public.trigger_refresh_seats();