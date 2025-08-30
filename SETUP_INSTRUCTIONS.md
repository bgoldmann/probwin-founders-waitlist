# Database Setup Instructions

## Supabase Database Schema Setup

Since the application requires database tables, you need to run the migration SQL manually in the Supabase dashboard.

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com/projects)
2. Select your project: `berahhdcvtlzqrtbrrjj`
3. Navigate to **SQL Editor**

### Step 2: Run Migration

Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` into the SQL Editor and execute it.

### Step 3: Quick Setup (Alternative)

If you want to test the application immediately, run these minimal SQL commands in the SQL Editor:

```sql
-- Quick setup for testing
CREATE TABLE IF NOT EXISTS public.waves (
    id INTEGER PRIMARY KEY,
    tier TEXT NOT NULL,
    total_seats INTEGER NOT NULL,
    filled_seats INTEGER NOT NULL DEFAULT 0,
    wave_number INTEGER NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data
INSERT INTO public.waves (id, tier, total_seats, filled_seats, wave_number) VALUES 
    (1, '99', 100, 5, 1),
    (2, '199', 50, 12, 2)
ON CONFLICT (id) DO UPDATE SET
    total_seats = EXCLUDED.total_seats,
    filled_seats = EXCLUDED.filled_seats;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access
CREATE POLICY "Allow public read access" ON public.waves
    FOR SELECT USING (true);
```

### Step 4: Test the Application

After setting up the database:

1. Run `npm run dev`
2. Visit `http://localhost:3000`
3. The seat counter should show live data

### Step 5: Stripe Setup (for payments)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create products for:
   - FastTrack: $99
   - FastTrack+: $199
3. Copy the price IDs and update `.env.local`

### Environment Variables Configured

✅ Supabase: Connected
✅ Stripe: Keys provided (need price IDs)
❓ hCaptcha: Needs setup
❓ Resend: Needs API key

The application is ready to run once the database tables are created!