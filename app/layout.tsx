import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://probwin.ai'),
  title: {
    default: 'ProbWin.ai Founders Waitlist — FastTrack Access to Data-First Sports Analytics',
    template: '%s | ProbWin.ai'
  },
  description: 'Join the exclusive ProbWin.ai founders waitlist. Limited seats available. Interview-based access with FastTrack credit applied to membership. Full refund if not accepted.',
  keywords: ['sports analytics', 'sports betting analytics', 'data-driven betting', 'probwin', 'founders waitlist'],
  authors: [{ name: 'ProbWin.ai' }],
  creator: 'ProbWin.ai',
  publisher: 'ProbWin.ai',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://probwin.ai/waitlist',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://probwin.ai/waitlist',
    siteName: 'ProbWin.ai',
    title: 'ProbWin.ai Founders Waitlist — Limited FastTrack Access',
    description: 'Join the exclusive ProbWin.ai founders waitlist. Interview-based access with full refund guarantee.',
    images: [
      {
        url: '/og-waitlist.png',
        width: 1200,
        height: 630,
        alt: 'ProbWin.ai Founders Waitlist: Wave 1 & 2 Now Open',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProbWin.ai Founders Waitlist — Limited FastTrack Access',
    description: 'Join the exclusive ProbWin.ai founders waitlist. Interview-based access with full refund guarantee.',
    images: ['/og-waitlist.png'],
    creator: '@probwinai',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}