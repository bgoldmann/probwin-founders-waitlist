# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a waitlist application for ProbWin.ai, a sports analytics platform. The waitlist has two paid tiers (FastTrack at $99 and FastTrack+ at $199) plus a free waitlist option.

## Tech Stack

- **Frontend**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: Vercel, Supabase (Postgres with Row Level Security)
- **Payments**: Stripe
- **Email**: Resend/Postmark
- **Security**: hCaptcha
- **Rate Limiting**: Upstash

## Key Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking

# Database
npx supabase db push # Push migrations to Supabase
npx supabase gen types typescript --local > types/supabase.ts # Generate TypeScript types
```

## Architecture

The application follows a standard Next.js App Router structure with:

- **API Routes** in `/app/api/` for handling:
  - Waitlist applications (`/api/waitlist/apply`)
  - Free waitlist signups (`/api/waitlist/free`)
  - Seat availability (`/api/seats`)
  - Stripe webhooks (`/api/stripe/webhook`)
  - Admin decisions (`/api/admin/decision`)

- **Database Schema**:
  - `waitlist_applications` - Paid tier applications with Stripe integration
  - `free_waitlist` - Free tier signups
  - `wave_caps` - Seat limits for each wave
  - Row Level Security (RLS) enabled on all tables

## Key Business Logic

1. **Payment Flow**: Applications create DB records first, then redirect to Stripe Checkout
2. **Refund Policy**: Automatic refunds within 3 business days if not accepted
3. **Seat Management**: Real-time seat counting with 30-60s polling intervals
4. **Interview Process**: FastTrack+ gets 72h scheduling SLA, decisions within 5 business days
5. **Credit System**: Application fees ($99/$199) credited toward first membership payment

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_99`
- `STRIPE_PRICE_ID_199`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `HCAPTCHA_SECRET`
- `HCAPTCHA_SITEKEY`

## Security Considerations

- Admin routes require authentication via Supabase auth + RLS
- All forms protected by hCaptcha
- Rate limiting on API endpoints
- Stripe webhook signature verification
- No storage of sensitive payment data (handled by Stripe)