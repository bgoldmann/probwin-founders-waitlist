'use client'

import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Checkbox } from '../ui/checkbox'
import { HCaptcha, type HCaptchaRef } from '../ui/hcaptcha'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  DollarSign,
  Clock,
  Target,
  FileText,
  Shield,
  CreditCard,
  Loader2
} from 'lucide-react'
import { FORM_FIELDS, VALIDATION_RULES, TIER_CONFIG } from '../../lib/constants'
import { cn } from '../../lib/utils'
import DOMPurify from 'dompurify'
import { z } from 'zod'

// Form validation schemas
const personalInfoSchema = z.object({
  fullName: z
    .string()
    .min(VALIDATION_RULES.FULL_NAME.MIN_LENGTH, 'Name must be at least 2 characters')
    .max(VALIDATION_RULES.FULL_NAME.MAX_LENGTH, 'Name is too long')
    .regex(VALIDATION_RULES.FULL_NAME.PATTERN, 'Please use only letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(VALIDATION_RULES.EMAIL.MAX_LENGTH, 'Email is too long'),
  phone: z
    .string()
    .regex(VALIDATION_RULES.PHONE.PATTERN, 'Please enter a valid phone number with country code')
})

const bettingInfoSchema = z.object({
  bankroll: z.string().min(1, 'Please select your bankroll'),
  timeCommitment: z.string().min(1, 'Please select your time commitment'),
  riskProfile: z.string().min(1, 'Please select your risk profile'),
})

const additionalInfoSchema = z.object({
  notes: z.string().max(VALIDATION_RULES.NOTES.MAX_LENGTH, 'Notes are too long').optional(),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy'),
})

interface FormData {
  // Personal Info
  fullName: string
  email: string
  phone: string
  // Betting Info
  bankroll: string
  timeCommitment: string
  riskProfile: string
  // Additional Info
  notes: string
  agreeToTerms: boolean
  agreeToPrivacy: boolean
}

interface WaitlistFormProps {
  selectedTier: '99' | '199'
  onSubmit: (data: FormData) => void
  onBack?: () => void
  className?: string
}

type FormStep = 'personal' | 'betting' | 'additional' | 'captcha' | 'review'

/**
 * Multi-step waitlist application form with validation and security
 * Optimized for 7%+ conversion rate with progress indication
 */
export function WaitlistForm({ selectedTier, onSubmit, onBack, className = '' }: WaitlistFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('personal')
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    bankroll: '',
    timeCommitment: '',
    riskProfile: '',
    notes: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  
  const hcaptchaRef = useRef<HCaptchaRef>(null)

  const steps: { key: FormStep; title: string; icon: React.ReactNode }[] = [
    { key: 'personal', title: 'Personal Info', icon: <User className="w-4 h-4" /> },
    { key: 'betting', title: 'Betting Profile', icon: <Target className="w-4 h-4" /> },
    { key: 'additional', title: 'Additional Info', icon: <FileText className="w-4 h-4" /> },
    { key: 'captcha', title: 'Security Check', icon: <Shield className="w-4 h-4" /> },
    { key: 'review', title: 'Review & Submit', icon: <Check className="w-4 h-4" /> },
  ]

  const currentStepIndex = steps.findIndex(step => step.key === currentStep)

  // Update form data with sanitization
  const updateFormData = (field: keyof FormData, value: any) => {
    const sanitizedValue = typeof value === 'string' ? DOMPurify.sanitize(value) : value
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Validate current step
  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {}

    try {
      switch (step) {
        case 'personal':
          personalInfoSchema.parse({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
          })
          break
        case 'betting':
          bettingInfoSchema.parse({
            bankroll: formData.bankroll,
            timeCommitment: formData.timeCommitment,
            riskProfile: formData.riskProfile,
          })
          break
        case 'additional':
          additionalInfoSchema.parse({
            notes: formData.notes,
            agreeToTerms: formData.agreeToTerms,
            agreeToPrivacy: formData.agreeToPrivacy,
          })
          break
        case 'captcha':
          if (!captchaToken) {
            newErrors.captcha = 'Please complete the security verification'
          }
          break
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message
          }
        })
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextIndex = currentStepIndex + 1
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].key)
      }
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key)
    } else if (onBack) {
      onBack()
    }
  }

  // Handle captcha verification
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    setErrors(prev => ({ ...prev, captcha: '' }))
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep('review')) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                index <= currentStepIndex ? "text-orange-600" : "text-gray-400"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  index < currentStepIndex
                    ? "bg-orange-600 border-orange-600 text-white"
                    : index === currentStepIndex
                    ? "border-orange-600 text-orange-600"
                    : "border-gray-300 text-gray-400"
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </div>
              <span className="hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Selected Tier Summary */}
      <Card className="mb-8 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {TIER_CONFIG[selectedTier].name} - ${TIER_CONFIG[selectedTier].price}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedTier === '99' 
                  ? 'Decision typically in 2-3 weeks'
                  : 'Interview within 72 hours'
                }
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      {/* Form Steps */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStepIndex].title}</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {steps.length}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {/* Personal Information */}
            {currentStep === 'personal' && (
              <motion.div
                key="personal"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => updateFormData('fullName', e.target.value)}
                      className={errors.fullName ? 'border-red-500' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.phone}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Betting Profile */}
            {currentStep === 'betting' && (
              <motion.div
                key="betting"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bankroll">Current Bankroll *</Label>
                    <Select
                      value={formData.bankroll}
                      onValueChange={(value) => updateFormData('bankroll', value)}
                    >
                      <SelectTrigger className={errors.bankroll ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select your bankroll range" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORM_FIELDS.BANKROLL_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bankroll && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.bankroll}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="timeCommitment">Time Commitment *</Label>
                    <Select
                      value={formData.timeCommitment}
                      onValueChange={(value) => updateFormData('timeCommitment', value)}
                    >
                      <SelectTrigger className={errors.timeCommitment ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select your daily time commitment" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORM_FIELDS.TIME_COMMITMENT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.timeCommitment && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.timeCommitment}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Risk Profile *</Label>
                    <RadioGroup
                      value={formData.riskProfile}
                      onValueChange={(value) => updateFormData('riskProfile', value)}
                      className="mt-2"
                    >
                      {FORM_FIELDS.RISK_PROFILE_OPTIONS.map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value}>{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {errors.riskProfile && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.riskProfile}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Additional Information */}
            {currentStep === 'additional' && (
              <motion.div
                key="additional"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Tell us about your betting experience, goals, or any questions..."
                      value={formData.notes}
                      onChange={(e) => updateFormData('notes', e.target.value)}
                      className={`resize-none h-24 ${errors.notes ? 'border-red-500' : ''}`}
                      maxLength={VALIDATION_RULES.NOTES.MAX_LENGTH}
                    />
                    {errors.notes && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.notes.length}/{VALIDATION_RULES.NOTES.MAX_LENGTH} characters
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => updateFormData('agreeToTerms', checked)}
                        className={errors.agreeToTerms ? 'border-red-500' : ''}
                      />
                      <Label htmlFor="agreeToTerms" className="text-sm leading-5">
                        I agree to the{' '}
                        <a href="/terms" className="text-orange-600 hover:underline" target="_blank">
                          Terms of Service
                        </a>{' '}
                        and understand that this is an application fee that is credited to my first payment if accepted.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreeToPrivacy"
                        checked={formData.agreeToPrivacy}
                        onCheckedChange={(checked) => updateFormData('agreeToPrivacy', checked)}
                        className={errors.agreeToPrivacy ? 'border-red-500' : ''}
                      />
                      <Label htmlFor="agreeToPrivacy" className="text-sm leading-5">
                        I agree to the{' '}
                        <a href="/privacy" className="text-orange-600 hover:underline" target="_blank">
                          Privacy Policy
                        </a>{' '}
                        and consent to being contacted regarding my application.
                      </Label>
                    </div>

                    {(errors.agreeToTerms || errors.agreeToPrivacy) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please agree to both terms to continue
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Check */}
            {currentStep === 'captcha' && (
              <motion.div
                key="captcha"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="text-center space-y-4">
                  <p className="text-gray-600">
                    Please complete the security verification to continue.
                  </p>
                  
                  <div className="flex justify-center">
                    <HCaptcha
                      ref={hcaptchaRef}
                      onVerify={handleCaptchaVerify}
                      onError={() => setErrors(prev => ({ ...prev, captcha: 'Security verification failed' }))}
                      className="mx-auto"
                    />
                  </div>

                  {errors.captcha && (
                    <p className="text-sm text-red-600 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.captcha}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Review */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Review Your Application</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{formData.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{formData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bankroll:</span>
                      <span className="font-medium">
                        {FORM_FIELDS.BANKROLL_OPTIONS.find(o => o.value === formData.bankroll)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Commitment:</span>
                      <span className="font-medium">
                        {FORM_FIELDS.TIME_COMMITMENT_OPTIONS.find(o => o.value === formData.timeCommitment)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Profile:</span>
                      <span className="font-medium">
                        {FORM_FIELDS.RISK_PROFILE_OPTIONS.find(o => o.value === formData.riskProfile)?.label}
                      </span>
                    </div>
                    {formData.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-gray-600">Notes:</span>
                        <p className="mt-1 text-gray-800">{formData.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• Complete secure payment with Stripe</li>
                      <li>• {selectedTier === '99' ? 'Wait for review (2-3 weeks)' : 'Schedule interview within 72 hours'}</li>
                      <li>• Receive decision notification</li>
                      <li>• If accepted: Fee applied to first payment</li>
                      <li>• If not accepted: Automatic full refund</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStepIndex === 0 ? 'Back to Tiers' : 'Previous'}
            </Button>

            {currentStep === 'review' ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}