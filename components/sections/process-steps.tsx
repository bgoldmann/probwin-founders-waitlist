'use client'

import { useState } from 'react'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { 
  FileText, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  UserCheck, 
  TrendingUp,
  ArrowRight,
  Clock,
  MessageCircle,
  Star,
  DollarSign,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ProcessStepsProps {
  selectedTier?: '99' | '199' | null
  className?: string
}

interface ProcessStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  duration: string
  details: string[]
  tier99Timeline: string
  tier199Timeline: string
  status: 'current' | 'upcoming' | 'optional'
}

const processSteps: ProcessStep[] = [
  {
    id: 'application',
    title: 'Submit Application',
    description: 'Complete your waitlist application with FastTrack payment',
    icon: <FileText className="w-5 h-5" />,
    duration: '5 minutes',
    details: [
      'Fill out personal and betting profile information',
      'Secure payment processed via Stripe',
      'Instant confirmation and receipt',
      'Application enters review queue'
    ],
    tier99Timeline: 'Immediate',
    tier199Timeline: 'Immediate',
    status: 'current'
  },
  {
    id: 'review',
    title: 'Application Review',
    description: 'Our team reviews your application and betting profile',
    icon: <UserCheck className="w-5 h-5" />,
    duration: 'Varies by tier',
    details: [
      'Comprehensive profile analysis',
      'Risk assessment evaluation',
      'Bankroll and commitment verification',
      'Initial qualification screening'
    ],
    tier99Timeline: '1-2 weeks',
    tier199Timeline: '24-48 hours',
    status: 'upcoming'
  },
  {
    id: 'interview',
    title: 'Interview Process',
    description: 'Personal interview to assess fit and commitment level',
    icon: <MessageCircle className="w-5 h-5" />,
    duration: '30-45 minutes',
    details: [
      'Video call with ProbWin team member',
      'Discussion of betting goals and strategy',
      'Platform walkthrough and Q&A',
      'Final suitability assessment'
    ],
    tier99Timeline: 'If qualified after review',
    tier199Timeline: 'Scheduled within 72 hours',
    status: 'upcoming'
  },
  {
    id: 'decision',
    title: 'Acceptance Decision',
    description: 'Receive notification of your application status',
    icon: <CheckCircle2 className="w-5 h-5" />,
    duration: 'Same day',
    details: [
      'Email notification with decision',
      'If accepted: Activation instructions',
      'If not accepted: Automatic refund initiated',
      'Feedback provided for future consideration'
    ],
    tier99Timeline: 'Within 48 hours of interview',
    tier199Timeline: 'Within 5 business days',
    status: 'upcoming'
  },
  {
    id: 'activation',
    title: 'Platform Activation',
    description: 'Activate your membership and start using ProbWin.ai',
    icon: <TrendingUp className="w-5 h-5" />,
    duration: '14 days to activate',
    details: [
      'FastTrack fee credited to first payment',
      'Full platform access activated',
      '7-day money-back guarantee begins',
      'Welcome onboarding and training'
    ],
    tier99Timeline: 'Your choice within 14 days',
    tier199Timeline: 'Your choice within 14 days',
    status: 'upcoming'
  }
]

const tierBenefits = {
  '99': {
    name: 'FastTrack',
    color: 'orange',
    highlights: [
      'Priority over free waitlist',
      'Decision in 2-3 weeks',
      'Full refund if not accepted'
    ]
  },
  '199': {
    name: 'FastTrack+',
    color: 'orange',
    highlights: [
      'Interview within 72 hours',
      'Decision within 5 business days',
      'Priority over all applicants'
    ]
  }
}

/**
 * Process steps visualization component
 * Shows the application journey with tier-specific timelines
 */
export function ProcessSteps({ selectedTier = null, className = '' }: ProcessStepsProps) {
  const [activeStep, setActiveStep] = useState<string>('application')
  const [showDetails, setShowDetails] = useState<string | null>(null)

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

  const stepVariants = {
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

  const getStepTimeline = (step: ProcessStep) => {
    if (!selectedTier) return step.duration
    return selectedTier === '99' ? step.tier99Timeline : step.tier199Timeline
  }

  const getStepColor = (step: ProcessStep, index: number) => {
    const isActive = step.id === activeStep
    const isPast = processSteps.findIndex(s => s.id === activeStep) > index
    
    if (isPast) return 'bg-green-600 border-green-600 text-white'
    if (isActive) return 'bg-orange-600 border-orange-600 text-white'
    return 'bg-white border-gray-300 text-gray-600'
  }

  const getConnectorColor = (index: number) => {
    const activeIndex = processSteps.findIndex(s => s.id === activeStep)
    return index < activeIndex ? 'bg-green-600' : 'bg-gray-300'
  }

  return (
    <section 
      className={cn("py-16 lg:py-20 bg-gray-50", className)}
      aria-labelledby="process-title"
    >
      <div className="container mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto"
        >
          {/* Section Header */}
          <motion.div variants={stepVariants} className="text-center mb-12">
            <h2 id="process-title" className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Your Path to ProbWin.ai
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
              From application to activation: a transparent, fair process designed for serious bettors.
            </p>
            
            {/* Tier Selection Benefits */}
            {selectedTier && (
              <motion.div variants={stepVariants} className="inline-flex items-center gap-2">
                <Badge className={`bg-${tierBenefits[selectedTier].color}-600 text-white px-4 py-2`}>
                  <Zap className="w-3 h-3 mr-1" />
                  {tierBenefits[selectedTier].name} Selected
                </Badge>
                <span className="text-sm text-gray-600">Accelerated timeline active</span>
              </motion.div>
            )}
          </motion.div>

          {/* Timeline Comparison (if no tier selected) */}
          {!selectedTier && (
            <motion.div variants={stepVariants} className="mb-12">
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">FastTrack ($99)</h3>
                      <Badge variant="secondary">Standard</Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {tierBenefits['99'].highlights.map((highlight, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-orange-300 shadow-lg relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-600 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">FastTrack+ ($199)</h3>
                      <Badge className="bg-orange-600 text-white">Premium</Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {tierBenefits['199'].highlights.map((highlight, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Process Steps */}
          <motion.div variants={containerVariants} className="relative">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-6">
              {processSteps.map((step, index) => (
                <motion.div key={step.id} variants={stepVariants}>
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      activeStep === step.id ? "border-orange-300 shadow-md" : "hover:border-gray-300"
                    )}
                    onClick={() => setActiveStep(step.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          getStepColor(step, index)
                        )}>
                          {step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{getStepTimeline(step)}</span>
                            </div>
                            <Badge variant="outline">
                              Step {index + 1}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div className="flex items-start justify-between relative">
                {/* Connecting Line */}
                <div className="absolute top-8 left-8 right-8 h-0.5 bg-gray-300" />
                <div 
                  className="absolute top-8 left-8 h-0.5 bg-orange-600 transition-all duration-500 ease-out"
                  style={{ 
                    width: `${((processSteps.findIndex(s => s.id === activeStep) + 1) / processSteps.length) * 100 - 8}%` 
                  }}
                />

                {processSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    variants={stepVariants}
                    className="flex-1 max-w-xs cursor-pointer"
                    onClick={() => setActiveStep(step.id)}
                  >
                    <div className="relative">
                      {/* Step Circle */}
                      <div className={cn(
                        "w-16 h-16 rounded-full border-4 flex items-center justify-center mx-auto mb-4 transition-all duration-200",
                        getStepColor(step, index),
                        "hover:scale-105"
                      )}>
                        {step.icon}
                      </div>

                      {/* Step Content */}
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                          {step.description}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-orange-600 bg-orange-50 rounded-full px-2 py-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">{getStepTimeline(step)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Step Details */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-12"
                >
                  <Card className="border-orange-200">
                    <CardContent className="p-6">
                      {(() => {
                        const step = processSteps.find(s => s.id === activeStep)!
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center">
                                {step.icon}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                                <p className="text-gray-600">{step.description}</p>
                              </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">What Happens:</h4>
                                <ul className="space-y-2">
                                  {step.details.map((detail, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      {detail}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">Timeline by Tier:</h4>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                    <span className="font-medium text-orange-900">FastTrack ($99)</span>
                                    <span className="text-sm text-orange-700">{step.tier99Timeline}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-orange-100 rounded-lg border border-orange-200">
                                    <span className="font-medium text-orange-900">FastTrack+ ($199)</span>
                                    <span className="text-sm text-orange-700 font-medium">{step.tier199Timeline}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Guarantee Section */}
          <motion.div variants={stepVariants} className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900">100% Money-Back Guarantee</h3>
                    <p className="text-green-700">No risk, full transparency</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800">Automatic refund if not accepted</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800">7-day trial after activation</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}