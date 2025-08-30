# ProbWin.ai Founders Waitlist

A high-conversion waitlist application for ProbWin.ai founders program with two-tier FastTrack access.

## Features

- **Two-Tier System**: FastTrack ($99) and FastTrack+ ($199) with different perks
- **Real-time Seat Counters**: Live updates showing Wave 1 (100 seats) and Wave 2 (500 seats) availability
- **Secure Payments**: Stripe integration with PCI DSS compliance
- **Interview Scheduling**: Automated scheduling for FastTrack+ within 72 hours
- **Full Refund Policy**: Automatic refunds if not accepted
- **Enterprise Security**: GDPR compliance, rate limiting, fraud detection

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL with RLS)
- **Payments**: Stripe
- **Email**: Resend
- **Security**: hCaptcha, JWT authentication
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- Resend account
- hCaptcha account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd probwin-founders-waitlist
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See `.env.example` for all required environment variables.

### Key Configuration

- **Wave Caps**: Wave 1 (100 seats), Wave 2 (500 seats)
- **Pricing**: FastTrack ($99), FastTrack+ ($199)
- **Membership**: Founders ($699/mo), Standard ($899/mo)
- **SLAs**: FastTrack+ interview within 72h, decision within 5 days

## Database Setup

The application uses Supabase with PostgreSQL. The enhanced schema includes:

- Row Level Security (RLS) policies
- Audit trails and compliance features
- Performance-optimized indexes
- Real-time seat counting

See `Research-Analysis.md` for complete database architecture.

## Security Features

- Input validation and sanitization
- XSS and CSRF protection
- Rate limiting and fraud detection
- GDPR compliance features
- Secure payment processing
- Audit logging

## Performance Targets

- **Core Web Vitals**: LCP < 2.5s, CLS < 0.05, TTI < 3.5s
- **Conversion Rate**: Target 7%+ paid FastTrack conversion
- **Security**: 99.9% threat prevention
- **Accessibility**: WCAG 2.1 AA compliance

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checking

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   └── waitlist/         # Domain-specific components
├── lib/                  # Utility functions
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── styles/               # Global styles
└── public/               # Static assets
```

## Contributing

1. Follow the established patterns and conventions
2. Ensure all code passes TypeScript checks
3. Test all changes thoroughly
4. Update documentation as needed

## License

Private - ProbWin.ai Founders Waitlist Application