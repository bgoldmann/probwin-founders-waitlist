import { Metadata } from 'next'
import WaitlistApp from '../components/waitlist-app'

export default function HomePage() {
  return <WaitlistApp />
}

// Export metadata for SEO
export const metadata: Metadata = {
  title: 'ProbWin.ai Founders Waitlist — Limited FastTrack Access Available',
  description: 'Join ProbWin.ai founders waitlist. Interview-based access with full refund guarantee. Limited seats available in Wave 1 and Wave 2.',
  keywords: 'sports analytics, betting analytics, data-first betting, founders waitlist, ProbWin',
  openGraph: {
    title: 'ProbWin.ai Founders Waitlist',
    description: 'Curated access for serious, data-first bettors. Interviews required.',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ProbWin.ai Founders Waitlist',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProbWin.ai Founders Waitlist',
    description: 'Curated access for serious, data-first bettors.',
    images: ['/og-image.jpg'],
  },
}