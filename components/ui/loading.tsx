'use client'

import { motion } from 'framer-motion'
import { Loader2, Zap } from 'lucide-react'
import { cn } from '../../lib/utils'
import { spinnerVariants, pulseVariants, animationConfig } from '../../lib/animations'

interface LoadingProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

/**
 * Loading component with multiple variants and smooth animations
 */
export function Loading({ 
  variant = 'spinner', 
  size = 'md', 
  text, 
  className = '' 
}: LoadingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        <motion.div variants={spinnerVariants} animate="animate">
          <Loader2 className={cn(sizes[size], 'text-orange-600')} />
        </motion.div>
        {text && (
          <span className={cn(textSizes[size], 'text-gray-600')}>
            {text}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center justify-center gap-1', className)}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 bg-orange-600 rounded-full"
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.2,
              ease: animationConfig.ease.smooth,
            }}
          />
        ))}
        {text && (
          <span className={cn(textSizes[size], 'text-gray-600 ml-2')}>
            {text}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        <motion.div variants={pulseVariants} animate="animate">
          <Zap className={cn(sizes[size], 'text-orange-600')} />
        </motion.div>
        {text && (
          <span className={cn(textSizes[size], 'text-gray-600')}>
            {text}
          </span>
        )}
      </div>
    )
  }

  return <LoadingSkeleton className={className} />
}

/**
 * Loading skeleton for content placeholders
 */
export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <motion.div
          key={index}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            width: `${Math.random() * 40 + 60}%`,
          }}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Full page loading overlay
 */
export function LoadingOverlay({ text = 'Loading...' }: { text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm mx-4">
        <Loading variant="spinner" size="lg" text={text} />
      </div>
    </motion.div>
  )
}

/**
 * Button loading state
 */
export function ButtonLoading({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <motion.div variants={spinnerVariants} animate="animate">
      <Loader2 className={cn(sizes[size], 'text-current')} />
    </motion.div>
  )
}

/**
 * Progress indicator with animation
 */
export function LoadingProgress({ 
  progress, 
  text, 
  className = '' 
}: { 
  progress: number
  text?: string
  className?: string 
}) {
  return (
    <div className={cn('w-full', className)}>
      {text && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">{text}</span>
          <span className="text-sm font-medium text-orange-600">
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{
            duration: animationConfig.duration.normal,
            ease: animationConfig.ease.smooth,
          }}
        />
      </div>
    </div>
  )
}