'use client'

import { Badge } from '../ui/badge'
import { 
  Shield, 
  Lock, 
  CreditCard, 
  RefreshCw, 
  CheckCircle2, 
  Star, 
  Users,
  Zap,
  Award,
  Clock
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface TrustBadgesProps {
  variant?: 'default' | 'minimal' | 'detailed'
  className?: string
}

interface TrustIndicator {
  icon: React.ReactNode
  title: string
  description: string
  type: 'security' | 'guarantee' | 'social' | 'process'
}

const trustIndicators: TrustIndicator[] = [
  {
    icon: <Shield className="w-4 h-4" />,
    title: "SSL Secured",
    description: "256-bit encryption protects your data",
    type: 'security'
  },
  {
    icon: <CreditCard className="w-4 h-4" />,
    title: "Stripe Payments",
    description: "PCI DSS compliant processing",
    type: 'security'
  },
  {
    icon: <RefreshCw className="w-4 h-4" />,
    title: "100% Refund",
    description: "Automatic refund if not accepted",
    type: 'guarantee'
  },
  {
    icon: <CheckCircle2 className="w-4 h-4" />,
    title: "Interview Process",
    description: "Curated member selection",
    type: 'process'
  },
  {
    icon: <Clock className="w-4 h-4" />,
    title: "7-Day Trial",
    description: "Money-back after activation",
    type: 'guarantee'
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: "Limited Access",
    description: "Exclusive membership program",
    type: 'social'
  }
]

const securityCertifications = [
  {
    icon: <Lock className="w-3 h-3" />,
    text: "SOX Compliant"
  },
  {
    icon: <Shield className="w-3 h-3" />,
    text: "GDPR Ready"
  },
  {
    icon: <Award className="w-3 h-3" />,
    text: "PCI DSS Level 1"
  }
]

const socialProof = [
  {
    icon: <Star className="w-3 h-3" />,
    text: "4.9/5 Rating"
  },
  {
    icon: <Users className="w-3 h-3" />,
    text: "1000+ Members"
  },
  {
    icon: <Zap className="w-3 h-3" />,
    text: "98% Success Rate"
  }
]

/**
 * Trust badges and security indicators component
 * Builds credibility and reduces conversion friction
 */
export function TrustBadges({ variant = 'default', className = '' }: TrustBadgesProps) {
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

  const badgeVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  }

  if (variant === 'minimal') {
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn("flex flex-wrap items-center justify-center gap-3", className)}
      >
        {securityCertifications.map((cert, index) => (
          <motion.div
            key={cert.text}
            variants={badgeVariants}
            className="flex items-center gap-1 text-xs text-gray-600 bg-white rounded-full px-2 py-1 border border-gray-200"
          >
            {cert.icon}
            <span>{cert.text}</span>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  if (variant === 'detailed') {
    return (
      <section className={cn("py-12 bg-white", className)} aria-labelledby="trust-title">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto"
          >
            <motion.div variants={badgeVariants} className="text-center mb-8">
              <h2 id="trust-title" className="text-2xl font-bold text-gray-900 mb-2">
                Trusted by Serious Bettors
              </h2>
              <p className="text-gray-600">
                Your security and success are our top priorities
              </p>
            </motion.div>

            {/* Main Trust Indicators Grid */}
            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
            >
              {trustIndicators.map((indicator, index) => (
                <motion.div
                  key={indicator.title}
                  variants={badgeVariants}
                  className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="text-orange-600 mb-2 flex justify-center">
                    {indicator.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {indicator.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {indicator.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Security Certifications & Social Proof */}
            <motion.div 
              variants={containerVariants}
              className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100"
            >
              {/* Security Certifications */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">Security:</span>
                <div className="flex items-center gap-3">
                  {securityCertifications.map((cert, index) => (
                    <motion.div
                      key={cert.text}
                      variants={badgeVariants}
                      className="flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded-full px-2 py-1 border border-green-200"
                    >
                      {cert.icon}
                      <span>{cert.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">Proven:</span>
                <div className="flex items-center gap-3">
                  {socialProof.map((proof, index) => (
                    <motion.div
                      key={proof.text}
                      variants={badgeVariants}
                      className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 rounded-full px-2 py-1 border border-blue-200"
                    >
                      {proof.icon}
                      <span>{proof.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    )
  }

  // Default variant
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("flex flex-wrap items-center justify-center gap-4 py-6", className)}
    >
      {/* Primary Trust Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {trustIndicators.slice(0, 4).map((indicator, index) => (
          <motion.div
            key={indicator.title}
            variants={badgeVariants}
            className="group"
          >
            <Badge 
              variant="secondary" 
              className="flex items-center gap-2 py-2 px-3 bg-white border border-gray-200 hover:border-orange-200 transition-colors cursor-default"
            >
              <span className="text-orange-600 group-hover:text-orange-700 transition-colors">
                {indicator.icon}
              </span>
              <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                {indicator.title}
              </span>
            </Badge>
          </motion.div>
        ))}
      </div>

      {/* Security Badges Row */}
      <motion.div 
        variants={badgeVariants}
        className="flex items-center gap-2 pt-2 border-t border-gray-100 w-full justify-center"
      >
        <span className="text-xs text-gray-500 mr-2">Secured by:</span>
        {securityCertifications.map((cert, index) => (
          <div
            key={cert.text}
            className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1"
          >
            {cert.icon}
            <span>{cert.text}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

/**
 * Floating trust badge for forms and checkout
 */
export function FloatingTrustBadge({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "fixed bottom-4 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-sm font-semibold text-gray-900">Secure Checkout</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Lock className="w-3 h-3 text-green-600" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <RefreshCw className="w-3 h-3 text-green-600" />
          <span>100% Refund Guarantee</span>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Inline security indicator for forms
 */
export function SecurityIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2", className)}>
      <Shield className="w-4 h-4 text-green-600" />
      <span>Your information is encrypted and secure</span>
      <Lock className="w-3 h-3 text-green-600" />
    </div>
  )
}