# ProbWin.ai – Founders Waitlist PRD

**Doc owner:** Bernie Goldmann  
**Stakeholders:** Product (Bernie), Eng (Goldmann LLC), Design, Compliance  
**Version:** v1.0  
**Status:** Ready for build  
**Tech stack:** Vercel (Next.js App Router, React 19), Supabase (Postgres + RLS), Stripe, Resend/Postmark, hCaptcha, shadcn/ui + Tailwind

---

## 1) Purpose & Goals
Create a high‑conversion, two‑tier waitlist funnel (paid FastTrack + free) that:
- Signals scarcity and curation to increase perceived value.
- Screens applicants via short interview + light KYC.
- Automates refunds if not accepted; credits fees toward first payment if accepted.
- Builds buzz while protecting brand with auditability and transparent rules.

**Primary KPI (30 days post‑launch):**
- Paid FastTrack conversion (form start → Stripe success): **≥ 7%**
- Approval-to-activation rate (accepted → first payment within 14 days): **≥ 60%**
- Free-to-paid upgrade rate within 21 days: **≥ 8%**

**Secondary KPI:**
- Interview show rate: **≥ 80%** (FastTrack+) / **≥ 60%** (FastTrack)
- Chargeback rate: **< 0.3%**

---

## 2) Offering & Policy (finalized)

### 2.1 Tiers & Seats
- **Wave 1 – FastTrack ($99)**: **100 seats** cap (application fee credited if accepted).
- **Wave 2 – FastTrack+ ($199)**: **500 seats** cap (application fee credited if accepted).
- **Free Waitlist**: unlimited, reviewed in later waves.

### 2.2 Perks & SLAs
- **FastTrack ($99):** Priority over free; decision typically in **2–3 weeks**.
- **FastTrack+ ($199):** **Interview scheduled within 72 hours** and **decision in 5 business days**.

### 2.3 Pricing at Activation (invite‑only)
- **Founders Cohort (limited seats):** $699/mo or $6,990/yr (lifetime rate if accepted at invite).
- **Standard:** $899/mo, $2,399/quarter, $8,990/yr.

### 2.4 Money Rules
- **Credit:** $99/$199 is applied to the first membership payment if accepted.
- **Not accepted:** **Automatic 100% refund** within **3 business days**.
- **Accepted but no activation:** Spot held **14 days**. After that, spot is released, and the $99/$199 becomes **non‑refundable site credit valid for 6 months**.
- **Optional deferral:** One **30‑day deferral** if requested before day 14.
- **Post‑activation guarantee:** **7‑day money‑back** on membership fees.

### 2.5 Eligibility (public)
- Commitment: ~**10 minutes/day** to follow bankroll rules.
- Mindset: **Data‑first**, comfortable with variance/long‑term ROI.
- Verification: **Short phone interview** + **light ID check (KYC)**.
- **No touts/syndicates**: individual members only; **no sharing/reselling** of picks, data, or accounts (violations = immediate ban; credits/promos void).
- **US & International** access; follow local laws.

### 2.6 Compliance & Disclaimers
- ProbWin.ai provides **analytics only**; **does not accept or place bets**.  
- Must be **21+** where applicable.  
- Members must follow their **local jurisdiction’s** laws and sportsbook rules.

---

## 3) User Flows

### 3.1 Paid FastTrack (99/199)
1. Land on waitlist page → choose tier ($99 or $199).  
2. Fill mini‑application (name, email, phone, country, bankroll range, books, time/day, risk profile, optional notes).  
3. Confirm eligibility switch (KYC & no‑sharing policy).  
4. Click **Continue — Pay $X FastTrack** → server creates DB app record + Stripe Checkout session → redirect.  
5. Stripe success → Success page with **Calendly** link for interview (FastTrack+: 72h scheduling SLA).  
6. Interview → Decision email
   - **Accepted:** activation link + **14‑day** deadline.  
   - **Rejected:** auto refund email.
7. Activation (checkout for membership): credit auto‑applied; optional speed perk (e.g., activate in 72h → bonus).  
8. Post‑activation onboarding + 7‑day money‑back window.

### 3.2 Free Waitlist
1. Land → free form (name, email, country).  
2. Success toast + email confirmation.  
3. Nurture emails → paid FastTrack CTA as seats tighten.  
4. When waves open: invite email with limited window.

---

## 4) UX Requirements (page)

### 4.1 Sections
- **Hero:** Title + subtitle; **US & International** line; orange CTA; **trust bar** (Stripe secure, auto refund, 7‑day money back, analytics‑only, limited seats).  
- **Chooser Card:** $99 vs $199 toggle; **perks list**; **scarcity meter** per wave with **“Last updated HH:MM ET”** label.  
- **Mini‑Application Form:** inputs above; eligibility switch; primary CTA.  
- **How It Works:** 4 step cards (Apply/Pay → Interview → Decision → Activate in 14 days).  
- **Proof (Transparency):** copy blocks for ROI/CLV/drawdowns; **Audit Log** button; “Inside the app” blurred preview; **Security & Compliance** badges.  
- **Eligibility** list + **Free waitlist** card.  
- **FAQ:** money rules, timelines, pricing, auditability, compliance.  
- **Footer:** Terms, Privacy, Refund Policy, contact, analytics‑only line.

### 4.2 Visual
- UI kit: **shadcn/ui**, **Tailwind**.  
- Brand: **orange** forward top nav; modern, clean, minimal; soft shadows; rounded‑2xl; motion subtle.
- Accessibility: contrast AA+, focus states, labels + aria‑describedby on complex components, semantic headings.
- Performance: LCP < 2.5s, CLS < 0.05, TTI < 3.5s on 4G.

### 4.3 Scarcity Logic (display)
- Display **filled / total** for Wave 1 & 2.  
- Update via `/api/seats` polling every 30–60s (and on `visibilitychange`).  
- Cache seat counts to localStorage for snappy loads; always refresh from API.  
- Show **“Last updated: HH:MM ET”** beneath each bar.

---

## 5) Information Architecture & Copy

### 5.1 Key Microcopy
- CTA microcopy under buttons: “**Secure Stripe checkout** · If not accepted: **automatic full refund**”.
- Money rules (short): “$99/$199 is an application credit. Not accepted? Full refund within 3 business days. Accepted? You have 14 days to activate; credit valid 6 months.”
- Compliance footer: “ProbWin.ai provides analytics only and does not accept or place bets. Must be 21+ where applicable. Follow your local laws.”

### 5.2 FAQ Entries (must‑ship)
- What happens to my $99/$199?  
- Decision timelines for each tier.  
- Activation window + deferral.  
- Membership pricing at activation (Founders vs Standard).  
- Refund policy (not accepted; post‑activation 7‑day guarantee).  
- “Do you take bets or handle funds?” → No.  
- Seat fairness: server‑side counters + timestamps (FIFO after interviews).  
- Auditability of results: ROI/CLV/drawdowns; public audit log.

---

## 6) System Design

### 6.1 Data Model (Supabase)
```sql
create type waitlist_tier as enum ('99','199');
create type waitlist_status as enum ('pending','accepted','rejected','refunded','activated');

create table public.waitlist_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tier waitlist_tier not null,
  wave int not null, -- 1 or 2
  status waitlist_status not null default 'pending',
  full_name text not null,
  email text not null,
  phone text,
  country text,
  bankroll text,
  books text,
  risk text,
  time_per_day text,
  experience text,
  notes text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  credit_amount_cents int not null default 0
);

create table public.free_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  country text
);

create table public.wave_caps (
  wave int primary key,
  total int not null
);

insert into public.wave_caps(wave,total) values (1,100) on conflict (wave) do nothing;
insert into public.wave_caps(wave,total) values (2,500) on conflict (wave) do nothing;

create or replace view public.v_wave_seats as
select wc.wave, wc.total,
       coalesce((select count(*) from public.waitlist_applications wa where wa.wave=wc.wave),0) as filled
from public.wave_caps wc;

alter table public.waitlist_applications enable row level security;
alter table public.free_waitlist enable row level security;
alter table public.wave_caps enable row level security;

create policy "no public read apps" on public.waitlist_applications for select to anon using (false);
create policy "no public read free"  on public.free_waitlist       for select to anon using (false);
create policy "no public read caps"  on public.wave_caps            for select to anon using (false);
```

### 6.2 API Endpoints (Next.js App Router)
- `POST /api/waitlist/apply` → create DB record, create Stripe Checkout, return `url`.
- `POST /api/waitlist/free` → add to `free_waitlist`.
- `GET /api/seats` → returns `{ wave, total, filled, lastUpdated }`.
- `POST /api/stripe/webhook` → handle checkout session completed → persist PI/customer IDs.
- `POST /api/admin/decision` → **admin‑only** accept/reject; issue refunds on reject, set status.
- `POST /api/admin/activate` (optional) → mark as activated when first subscription payment clears.

**Security:** Admin routes protected via Supabase auth + RLS or Vercel Protect; SERVICE key used server‑side only.

### 6.3 Stripe
- **Products/Prices:**
  - `fasttrack_99` → one‑time $99 (Price ID env: `STRIPE_PRICE_ID_99`).
  - `fasttrack_199` → one‑time $199 (Price ID env: `STRIPE_PRICE_ID_199`).
- **Metadata:** store `app_id`, `tier`, `wave` on Checkout Session.
- **Webhook:** verify with `STRIPE_WEBHOOK_SECRET`.
- **Refunds:** `refund(payment_intent)` on rejection; send email.
- **Activation:** next purchase (membership) applies credit; implement via coupon/discount or internal ledger.

### 6.4 Emails (Resend/Postmark)
- **Templates:**
  1) *Payment received — schedule your interview* (include Calendly link; SLA reminders).  
  2) *Interview reminder (24h)*.  
  3) *Decision — accepted* (activation link + 14‑day deadline + deferral instructions).  
  4) *Decision — not accepted* (refund initiated; 3‑business‑day note).  
  5) *Activation reminder — day 10* (countdown).  
  6) *Free waitlist confirmation* + nurture sequence.
- **Sender:** `support@probwin.ai` (SPF/DKIM/DMARC configured).  
- **Legal footer:** company info, Terms/Privacy/Refunds links, analytics‑only disclaimer.

### 6.5 Anti‑bot & Fraud
- **hCaptcha** on both forms.  
- **Rate limit** `/api/waitlist/*` via Upstash.  
- **Email uniqueness** per wave (prevent duplicates inflating seats).  
- **Phone/email verification** optional.

### 6.6 Transparency / Audit Log (Phase 1.5)
- Pre‑game pick payload hashed (SHA‑256) and timestamped; store `{hash, sport, event_time}`.  
- Reveal full pick after game start; allow public verification by recomputing hash.  
- Publish daily ROI, cumulative ROI, CLV, drawdown; add disclaimer about variance and sample size.

---

## 7) SEO, Analytics & A/B

### 7.1 SEO
- Title: “ProbWin.ai Founders Waitlist — FastTrack Access to Data‑First Sports Analytics”.  
- Meta description: “Curated, limited seats. Interview‑based access. FastTrack credit applied to membership; full refund if not accepted.”  
- OG/Twitter image: branded card with “Founders Waitlist: Wave 1 & 2 now open”.  
- Schema: `SoftwareApplication` + `FAQPage` for FAQ entries.

### 7.2 Analytics
- Vercel Web Analytics + custom events stored to Supabase:  
  - `view_waitlist`, `click_cta_tier_99`, `click_cta_tier_199`, `form_start_paid`, `checkout_started`, `checkout_success`, `interview_scheduled`, `decision_sent`, `accepted`, `refunded`, `activated`.
- Funnels & attribution via UTM.

### 7.3 A/B Tests (post‑MVP)
- Default selected tier (99 vs 199).  
- CTA copy variants.  
- Trust bar wording order.  
- Adding mini social proof (“X interviews booked this week”).

---

## 8) Acceptance Criteria
- [ ] Two paid tiers functional with Stripe Checkout; free list captured.  
- [ ] DB records created **before** redirect; Stripe session IDs stored.  
- [ ] Seat counters show `filled/total` for both waves; **“Last updated HH:MM ET”** visible; counters pull from `/api/seats`.  
- [ ] FastTrack+ interview can be scheduled within **72h**; decision email sent within **5 business days** (manual OK for MVP).  
- [ ] Rejections trigger **automatic refund** + email.  
- [ ] Accepted applicants receive activation link; **14‑day** timer communicated; **deferral** request path documented.  
- [ ] Activation credits apply to first membership payment (mechanism documented).  
- [ ] Compliance copy visible in hero trust bar, FAQ, and footer.  
- [ ] Accessibility checks pass (labels, keyboard, contrast).  
- [ ] Page meets performance budget on 4G.

---

## 9) Test Plan (MVP)
**Functional**
- Create app (99/199) → Stripe success → webhook writes PI → success page shows calendly.
- Admin reject → Stripe refund issued → status=`refunded` → email sent.
- Admin accept → status=`accepted` → activation email sent.
- Activation after 15 days → credit still stored but spot released (UI copy verified).
- Free waitlist form → record in DB → confirmation email.

**Edge/Fraud**
- Duplicate email same wave blocked or merged.  
- Missing webhook signature → 400.  
- Admin endpoint auth required.  
- hCaptcha failure blocks submission.  
- Rate limit exceeded returns 429.

**Accessibility/Perf**
- Keyboard nav through form + toggles.  
- LCP < 2.5s on 4G, CLS < 0.05.

---

## 10) Implementation Notes
- **Env Vars:**
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID_99=price_...
STRIPE_PRICE_ID_199=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
HCAPTCHA_SECRET=...
HCAPTCHA_SITEKEY=...
```
- **Credit application**: simplest path is generating a **one‑time coupon** equal to $99/$199 and attaching it to the first subscription. Alternate: internal ledger + manual invoice item.
- **Calendly**: embed link on success page + reminder in email.
- **Seat fairness**: count all paid apps; order FIFO post‑interview.

---

## 11) Risks & Mitigations
- **Perceived gatekeeping** → Clear SLA + refund rules visible up‑front; free waitlist prominent.  
- **Chargebacks** → Crystal‑clear disclosures in checkout + email; auto refunds on rejection; keep logs.  
- **Abuse (sharing picks)** → Legal TOS + watermarking + monitoring; instant ban policy.

---

## 12) Rollout Plan
- **Week 1:** Build DB + API + Stripe + Emails; ship page; manual admin dashboard (SQL + Supabase UI).  
- **Week 2:** Add audit log MVP + nurture emails; start A/B experiments.  
- **Week 3+:** Admin UI, analytics dashboards, automate deferral handling.

---

## 13) Appendix – Copy Blocks
**Hero subtitle:** “Curated access for serious, data‑first bettors. Interviews required. If you’re not accepted, we refund you 100%.”

**CTA microcopy:** “Secure Stripe checkout · Credited to first payment · Auto refund if not accepted.”

**Footer line:** “ProbWin.ai provides analytics only and does not accept or place bets. Must be 21+ where applicable. Follow your local laws.”

**Eligibility bullets:** commitment, mindset, interview + light KYC, no touts/syndicates, no sharing/reselling, US & International.

---

**End of PRD**

