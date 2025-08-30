'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Check, Users, Clock, Zap, Crown, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TIER_CONFIG } from '../../lib/constants'

interface TierSelectorProps {
  onTierSelect: (tier: '99' | '199') => void
  className?: string
}

interface SeatCounts {
  tier_99_available: number
  tier_199_available: number
  tier_99_total: number
  tier_199_total: number
  last_updated: string
}

/**
 * Tier selector with real-time seat counters and conversion optimization
 * Features scarcity messaging and visual hierarchy for 7%+ conversion
 */
export function TierSelector({ onTierSelect, className = '' }: TierSelectorProps) {
  const [seatCounts, setSeatCounts] = useState<SeatCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch seat counts from API
  useEffect(() => {
    const fetchSeatCounts = async () => {
      try {
        const response = await fetch('/api/seats')
        if (!response.ok) {
          throw new Error('Failed to fetch seat counts')
        }
        const data = await response.json()
        setSeatCounts(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching seat counts:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSeatCounts()
    
    // Refresh seat counts every 30 seconds
    const interval = setInterval(fetchSeatCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate scarcity level for visual urgency
  const getScarcityLevel = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage <= 10) return 'critical'
    if (percentage <= 25) return 'high'
    if (percentage <= 50) return 'medium'
    return 'low'
  }

  const getScarcityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  }

  return (
    <section 
      className={`py-16 lg:py-20 bg-gray-50 ${className}`}
      aria-labelledby="tier-selector-title"
    >
      <div className="container mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto"
        >
          {/* Section Header */}
          <motion.div variants={cardVariants} className="text-center mb-12">
            <h2 
              id="tier-selector-title"
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Choose Your FastTrack Tier
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Limited seats available. Each tier includes full refund if not accepted.
            </p>
          </motion.div>

          {/* Loading State */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                  Loading available seats...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-8"
              >
                <p className="text-red-700">
                  Unable to load seat availability. Please refresh the page.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tier Cards */}
          <AnimatePresence>
            {!loading && seatCounts && (
              <motion.div
                variants={containerVariants}
                className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
              >
                {/* Tier 1: FastTrack ($99) */}
                <motion.div variants={cardVariants}>
                  <Card className="relative h-full border-2 hover:border-orange-200 transition-all duration-200 hover:shadow-lg">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                          <Zap className="w-6 h-6 text-orange-500" />
                          {TIER_CONFIG['99'].name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-lg text-gray-600">
                        Priority review over free waitlist
                      </CardDescription>
                      
                      {/* Seat Counter */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${
                        getScarcityColor(getScarcityLevel(seatCounts.tier_99_available, seatCounts.tier_99_total))
                      }`}>
                        <Users className="w-3 h-3" />
                        <span>
                          {seatCounts.tier_99_available} of {seatCounts.tier_99_total} seats left
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Price */}
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900">
                          ${TIER_CONFIG['99'].price}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Applied to first payment if accepted
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3">
                        {TIER_CONFIG['99'].features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Timeline */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <Clock className="w-4 h-4" />
                        <span>Decision typically in 2-3 weeks</span>
                      </div>

                      {/* CTA Button */}
                      <Button
                        onClick={() => onTierSelect('99')}
                        disabled={seatCounts.tier_99_available === 0}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {seatCounts.tier_99_available === 0 ? (
                          'Sold Out'
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Select FastTrack
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Tier 2: FastTrack+ ($199) */}
                <motion.div variants={cardVariants}>
                  <Card className="relative h-full border-2 border-orange-200 hover:border-orange-300 transition-all duration-200 hover:shadow-xl shadow-lg">
                    {/* Premium Badge */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1">
                        <Crown className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>

                    <CardHeader className="pb-4 pt-8">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                          <Crown className="w-6 h-6 text-orange-600" />
                          {TIER_CONFIG['199'].name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-lg text-gray-600">
                        Interview within 72 hours
                      </CardDescription>
                      
                      {/* Seat Counter */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${
                        getScarcityColor(getScarcityLevel(seatCounts.tier_199_available, seatCounts.tier_199_total))
                      }`}>
                        <Users className="w-3 h-3" />
                        <span>
                          {seatCounts.tier_199_available} of {seatCounts.tier_199_total} seats left
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Price */}
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900">
                          ${TIER_CONFIG['199'].price}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Applied to first payment if accepted
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3">
                        {TIER_CONFIG['199'].features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Timeline */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Decision within 5 business days</span>
                      </div>

                      {/* CTA Button */}
                      <Button
                        onClick={() => onTierSelect('199')}
                        disabled={seatCounts.tier_199_available === 0}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {seatCounts.tier_199_available === 0 ? (
                          'Sold Out'
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Select FastTrack+
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last Updated Timestamp */}
          <AnimatePresence>
            {!loading && seatCounts && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-8"
              >
                <p className="text-xs text-gray-400">
                  Seat availability last updated: {new Date(seatCounts.last_updated).toLocaleString()}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}