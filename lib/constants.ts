// Application constants for ProbWin.ai waitlist

export const ROUTES = {
  HOME: '/',
  WAITLIST: '/waitlist',
  SUCCESS: '/success',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  REFUND_POLICY: '/refund-policy',
  ADMIN: '/admin',
} as const;

export const API_ROUTES = {
  SEATS: '/api/seats',
  WAITLIST_APPLY: '/api/waitlist/apply',
  WAITLIST_FREE: '/api/waitlist/free',
  STRIPE_WEBHOOK: '/api/stripe/webhook',
  STRIPE_CREATE_CHECKOUT: '/api/stripe/create-checkout',
  ADMIN_DECISION: '/api/admin/decision',
} as const;

export const FORM_FIELDS = {
  BANKROLL_OPTIONS: [
    { value: 'under-1k', label: 'Under $1,000' },
    { value: '1k-5k', label: '$1,000 - $5,000' },
    { value: '5k-10k', label: '$5,000 - $10,000' },
    { value: '10k-25k', label: '$10,000 - $25,000' },
    { value: '25k-plus', label: '$25,000+' },
  ],
  TIME_COMMITMENT_OPTIONS: [
    { value: '5-10min', label: '5-10 minutes/day' },
    { value: '10-30min', label: '10-30 minutes/day' },
    { value: '30-60min', label: '30-60 minutes/day' },
    { value: '60min-plus', label: '60+ minutes/day' },
  ],
  RISK_PROFILE_OPTIONS: [
    { value: 'conservative', label: 'Conservative' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'aggressive', label: 'Aggressive' },
  ],
} as const;

export const TIER_CONFIG = {
  '99': {
    name: 'FastTrack',
    price: 99,
    wave: 1,
    features: [
      'Priority review over free waitlist',
      'Decision typically in 2-3 weeks',
      'Credit applied to first payment if accepted',
      'Full refund if not accepted',
    ],
    badge: null,
  },
  '199': {
    name: 'FastTrack+',
    price: 199,
    wave: 2,
    features: [
      'Interview scheduled within 72 hours',
      'Decision within 5 business days',
      'Priority over all other applicants',
      'Credit applied to first payment if accepted',
      'Full refund if not accepted',
    ],
    badge: 'Premium',
  },
} as const;

export const TRUST_INDICATORS = [
  {
    icon: 'shield',
    text: 'SSL Secured',
    description: 'Your data is encrypted and protected',
  },
  {
    icon: 'credit-card',
    text: 'Stripe Checkout',
    description: 'Secure payment processing',
  },
  {
    icon: 'refresh-cw',
    text: 'Auto Refund',
    description: '100% refund if not accepted',
  },
  {
    icon: 'clock',
    text: '7-Day Trial',
    description: 'Money-back guarantee after activation',
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'What happens to my $99/$199 FastTrack fee?',
    answer: 'Your FastTrack fee is an application credit. If accepted, it\'s applied to your first membership payment. If not accepted, you receive a full automatic refund within 3 business days.',
  },
  {
    question: 'What are the decision timelines for each tier?',
    answer: 'FastTrack ($99): Decision typically in 2-3 weeks. FastTrack+ ($199): Interview scheduled within 72 hours and decision in 5 business days.',
  },
  {
    question: 'How long do I have to activate after acceptance?',
    answer: 'You have 14 days to activate your membership after acceptance. You can request one 30-day deferral if needed. After that, your spot is released and the fee becomes non-refundable site credit valid for 6 months.',
  },
  {
    question: 'What is the membership pricing at activation?',
    answer: 'Founders Cohort (limited seats): $699/mo or $6,990/yr (lifetime rate). Standard: $899/mo, $2,399/quarter, $8,990/yr.',
  },
  {
    question: 'Do you accept or place bets?',
    answer: 'No. ProbWin.ai provides analytics only and does not accept or place bets. We are a data analytics platform that helps you make informed decisions.',
  },
  {
    question: 'What is your refund policy?',
    answer: 'Not accepted: Automatic 100% refund within 3 business days. Post-activation: 7-day money-back guarantee on membership fees.',
  },
  {
    question: 'How do you ensure fairness in seat allocation?',
    answer: 'Seats are allocated on a first-come, first-served basis after successful interviews, with server-side counters and timestamps ensuring fairness.',
  },
] as const;

export const COPY = {
  HERO: {
    TITLE: 'Join the Founders Waitlist',
    SUBTITLE: 'Curated access for serious, data-first bettors. Interviews required. If you\'re not accepted, we refund you 100%.',
    CTA: 'Claim Your FastTrack Spot',
  },
  FOOTER: {
    DISCLAIMER: 'ProbWin.ai provides analytics only and does not accept or place bets. Must be 21+ where applicable. Follow your local laws.',
  },
  CTA_MICROCOPY: 'Secure Stripe checkout · Credited to first payment · Auto refund if not accepted',
} as const;

export const VALIDATION_RULES = {
  FULL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z\s'-]+$/,
  },
  EMAIL: {
    MAX_LENGTH: 254,
  },
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
  },
  NOTES: {
    MAX_LENGTH: 500,
  },
} as const;

export const ANALYTICS_EVENTS = {
  VIEW_WAITLIST: 'view_waitlist',
  CLICK_CTA_TIER_99: 'click_cta_tier_99',
  CLICK_CTA_TIER_199: 'click_cta_tier_199',
  FORM_START_PAID: 'form_start_paid',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_SUCCESS: 'checkout_success',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  DECISION_SENT: 'decision_sent',
  ACCEPTED: 'accepted',
  REFUNDED: 'refunded',
  ACTIVATED: 'activated',
} as const;