'use client'

import { useState } from 'react'
import { HeroSection } from './sections/hero-section'
import { TierSelector } from './sections/tier-selector'
import { WaitlistForm } from './forms/waitlist-form'
import { TrustBadges } from './sections/trust-badges'
import { ProcessSteps } from './sections/process-steps'
import { FAQ } from './sections/faq'
import { ScrollReveal } from './ui/scroll-reveal'
import { LoadingOverlay } from './ui/loading'
import { motion, AnimatePresence } from 'framer-motion'

type AppState = 'landing' | 'tier-selection' | 'application' | 'processing' | 'success'

interface FormData {
  fullName: string
  email: string
  phone: string
  bankroll: string
  timeCommitment: string
  riskProfile: string
  notes: string
  agreeToTerms: boolean
  agreeToPrivacy: boolean
}

export default function WaitlistApp() {
  const [currentState, setCurrentState] = useState<AppState>('landing')
  const [selectedTier, setSelectedTier] = useState<'99' | '199' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle primary CTA from hero section
  const handleHeroAction = () => {
    setCurrentState('tier-selection')
    // Smooth scroll to tier selector
    setTimeout(() => {
      const tierSection = document.getElementById('tier-selector')
      tierSection?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Handle tier selection
  const handleTierSelect = (tier: '99' | '199') => {
    setSelectedTier(tier)
    setCurrentState('application')
    // Smooth scroll to form
    setTimeout(() => {
      const formSection = document.getElementById('waitlist-form')
      formSection?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Handle form submission
  const handleFormSubmit = async (formData: FormData) => {
    if (!selectedTier) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // First, submit the application
      const applicationResponse = await fetch('/api/waitlist/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tier: selectedTier,
        })
      })

      if (!applicationResponse.ok) {
        throw new Error('Failed to submit application')
      }

      const { applicationId } = await applicationResponse.json()

      // Then, create Stripe checkout session
      const checkoutResponse = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          tier: selectedTier,
          email: formData.email,
          name: formData.fullName,
        })
      })

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await checkoutResponse.json()
      
      // Redirect to Stripe Checkout
      window.location.href = url
      
    } catch (err) {
      console.error('Form submission error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  // Handle back navigation
  const handleBack = () => {
    if (currentState === 'application') {
      setCurrentState('tier-selection')
      setSelectedTier(null)
    } else if (currentState === 'tier-selection') {
      setCurrentState('landing')
    }
  }

  return (
    <>
      <main className="min-h-screen bg-white">
        {/* Hero Section - Always visible */}
        <HeroSection 
          onPrimaryAction={handleHeroAction}
          className="relative z-10"
        />

        {/* Trust Badges */}
        <ScrollReveal direction="up" className="border-t border-gray-100">
          <TrustBadges variant="minimal" className="py-8" />
        </ScrollReveal>

        {/* Tier Selection */}
        <AnimatePresence>
          {(currentState === 'tier-selection' || currentState === 'application') && (
            <motion.section
              id="tier-selector"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <ScrollReveal direction="up">
                <TierSelector 
                  onTierSelect={handleTierSelect}
                />
              </ScrollReveal>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Application Form */}
        <AnimatePresence>
          {currentState === 'application' && selectedTier && (
            <motion.section
              id="waitlist-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.2 }}
              className="py-16 bg-gray-50"
            >
              <div className="container mx-auto px-4">
                <ScrollReveal direction="up">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      Complete Your Application
                    </h2>
                    <p className="text-xl text-gray-600">
                      Secure your {selectedTier === '99' ? 'FastTrack' : 'FastTrack+'} spot today
                    </p>
                  </div>
                  
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <p className="text-red-700">{error}</p>
                    </motion.div>
                  )}

                  <WaitlistForm
                    selectedTier={selectedTier}
                    onSubmit={handleFormSubmit}
                    onBack={handleBack}
                  />
                </ScrollReveal>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Process Steps */}
        <ScrollReveal direction="up">
          <ProcessSteps 
            selectedTier={selectedTier}
          />
        </ScrollReveal>

        {/* FAQ Section */}
        <ScrollReveal direction="up">
          <FAQ />
        </ScrollReveal>

        {/* Final Trust Section */}
        <ScrollReveal direction="up">
          <section className="py-16 bg-gray-900">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Join the Future of Sports Analytics?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Limited seats available. Interview-based acceptance. Full refund if not selected.
              </p>
              
              {currentState === 'landing' && (
                <motion.button
                  onClick={handleHeroAction}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-lg">Get Started Now</span>
                </motion.button>
              )}

              <TrustBadges variant="minimal" className="mt-12 opacity-60" />
            </div>
          </section>
        </ScrollReveal>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <LoadingOverlay text="Processing your application..." />
        )}
      </AnimatePresence>
    </>
  )
}