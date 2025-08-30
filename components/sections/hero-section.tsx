'use client'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Shield, CreditCard, RefreshCw, Clock, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { COPY, TRUST_INDICATORS } from '../../lib/constants'

interface HeroSectionProps {
  onPrimaryAction: () => void
  className?: string
}

/**
 * Hero section with trust indicators and conversion-optimized messaging
 * Based on UI/UX research recommendations for 7%+ conversion rate
 */
export function HeroSection({ onPrimaryAction, className = '' }: HeroSectionProps) {
  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  }

  const trustIcons = {
    'shield': Shield,
    'credit-card': CreditCard,
    'refresh-cw': RefreshCw,
    'clock': Clock,
  }

  return (
    <section 
      className={`relative bg-gradient-to-br from-white via-orange-50/30 to-orange-100/50 py-16 lg:py-20 ${className}`}
      aria-labelledby="hero-title"
    >
      {/* Background pattern for visual interest */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" aria-hidden="true" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Brand Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">ProbWin.ai</span>
            </div>
            <Badge variant="secondary" className="mb-6">
              <CheckCircle className="w-3 h-3 mr-1" />
              US & International Access
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            id="hero-title"
            variants={itemVariants}
            className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {COPY.HERO.TITLE}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            {COPY.HERO.SUBTITLE}
          </motion.p>

          {/* Trust Bar */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 mb-10 py-4"
          >
            {TRUST_INDICATORS.map((indicator, index) => {
              const IconComponent = trustIcons[indicator.icon as keyof typeof trustIcons]
              
              return (
                <div
                  key={indicator.text}
                  className="flex items-center gap-2 text-sm text-gray-600"
                  title={indicator.description}
                >
                  <IconComponent className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="font-medium">{indicator.text}</span>
                </div>
              )
            })}
          </motion.div>

          {/* Primary CTA */}
          <motion.div variants={itemVariants} className="mb-8">
            <Button
              onClick={onPrimaryAction}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              aria-describedby="cta-description"
            >
              <span className="text-lg">{COPY.HERO.CTA}</span>
            </Button>
            
            {/* CTA Microcopy */}
            <p 
              id="cta-description"
              className="text-sm text-gray-500 mt-3 max-w-md mx-auto"
            >
              {COPY.CTA_MICROCOPY}
            </p>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-sm text-gray-400">See available tiers</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
              className="text-gray-400"
              aria-hidden="true"
            >
              ↓
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Accessibility improvements */}
      <div className="sr-only">
        <h2>Key Benefits</h2>
        <ul>
          <li>Secure payment processing with SSL encryption</li>
          <li>100% money-back guarantee if not accepted</li>
          <li>Analytics-only platform - we don't place bets</li>
          <li>7-day trial period after activation</li>
        </ul>
      </div>
    </section>
  )
}