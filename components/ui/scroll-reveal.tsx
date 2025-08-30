'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, Variants } from 'framer-motion'
import { scrollVariants, animationConfig, getReducedMotionVariants } from '../../lib/animations'
import { cn } from '../../lib/utils'

interface ScrollRevealProps {
  children: React.ReactNode
  variants?: Variants
  threshold?: number
  triggerOnce?: boolean
  delay?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  duration?: number
  stagger?: boolean
  staggerDelay?: number
}

/**
 * Scroll-triggered reveal animation component
 * Animates children when they come into view
 */
export function ScrollReveal({
  children,
  variants,
  threshold = 0.1,
  triggerOnce = true,
  delay = 0,
  className = '',
  direction = 'up',
  distance = 50,
  duration = animationConfig.duration.slow,
  stagger = false,
  staggerDelay = 0.1,
}: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: triggerOnce,
    margin: '0px 0px -100px 0px' // Trigger slightly before element is fully visible
  })
  const controls = useAnimation()

  // Create direction-based variants if no custom variants provided
  const getDirectionVariants = (): Variants => {
    const transforms = {
      up: { y: distance },
      down: { y: -distance },
      left: { x: distance },
      right: { x: -distance },
    }

    return {
      offscreen: {
        opacity: 0,
        ...transforms[direction],
      },
      onscreen: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration,
          ease: animationConfig.ease.smooth,
          delay,
          ...(stagger && {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          }),
        },
      },
    }
  }

  const finalVariants = getReducedMotionVariants(variants || getDirectionVariants())

  useEffect(() => {
    if (isInView) {
      controls.start('onscreen')
    } else if (!triggerOnce) {
      controls.start('offscreen')
    }
  }, [isInView, controls, triggerOnce])

  return (
    <motion.div
      ref={ref}
      variants={finalVariants}
      initial="offscreen"
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered children reveal component
 * Animates each child with a delay
 */
export function StaggeredReveal({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
  className = '',
  ...props
}: Omit<ScrollRevealProps, 'stagger' | 'staggerDelay'> & {
  staggerDelay?: number
  initialDelay?: number
}) {
  const containerVariants: Variants = {
    offscreen: {
      opacity: 0,
    },
    onscreen: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  }

  const itemVariants: Variants = {
    offscreen: {
      opacity: 0,
      y: 30,
    },
    onscreen: {
      opacity: 1,
      y: 0,
      transition: {
        duration: animationConfig.duration.normal,
        ease: animationConfig.ease.smooth,
      },
    },
  }

  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start('onscreen')
    }
  }, [isInView, controls])

  return (
    <motion.div
      ref={ref}
      variants={getReducedMotionVariants(containerVariants)}
      initial="offscreen"
      animate={controls}
      className={cn('space-y-4', className)}
    >
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <motion.div key={index} variants={getReducedMotionVariants(itemVariants)}>
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={getReducedMotionVariants(itemVariants)}>
          {children}
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * Counter animation component
 * Animates numbers counting up when in view
 */
export function AnimatedCounter({
  end,
  start = 0,
  duration = 2,
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
}: {
  end: number
  start?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        transition: {
          duration,
          ease: 'easeOut',
        },
      })
    }
  }, [isInView, controls, end, duration])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={controls}
    >
      {prefix}
      {end.toFixed(decimals)}
      {suffix}
    </motion.span>
  )
}

/**
 * Progress bar animation
 */
export function AnimatedProgressBar({
  progress,
  height = 'h-2',
  backgroundColor = 'bg-gray-200',
  progressColor = 'bg-orange-600',
  className = '',
  showPercentage = false,
  label,
}: {
  progress: number
  height?: string
  backgroundColor?: string
  progressColor?: string
  className?: string
  showPercentage?: boolean
  label?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start({
        scaleX: progress / 100,
        transition: {
          duration: 1.5,
          ease: 'easeOut',
        },
      })
    }
  }, [isInView, controls, progress])

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-orange-600">
              {progress}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full rounded-full overflow-hidden', height, backgroundColor)}>
        <motion.div
          ref={ref}
          className={cn('h-full rounded-full origin-left', progressColor)}
          initial={{ scaleX: 0 }}
          animate={controls}
        />
      </div>
    </div>
  )
}

/**
 * Text reveal animation
 * Reveals text word by word or character by character
 */
export function AnimatedText({
  text,
  mode = 'word',
  staggerDelay = 0.1,
  className = '',
  tag: Tag = 'span',
}: {
  text: string
  mode?: 'word' | 'char'
  staggerDelay?: number
  className?: string
  tag?: keyof JSX.IntrinsicElements
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const controls = useAnimation()

  const words = text.split(' ')
  const chars = text.split('')

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: animationConfig.ease.smooth,
      },
    },
  }

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  return (
    <Tag className={className}>
      <motion.span
        ref={ref}
        variants={getReducedMotionVariants(containerVariants)}
        initial="hidden"
        animate={controls}
      >
        {mode === 'word'
          ? words.map((word, index) => (
              <motion.span
                key={index}
                variants={getReducedMotionVariants(itemVariants)}
                className="inline-block mr-1"
              >
                {word}
              </motion.span>
            ))
          : chars.map((char, index) => (
              <motion.span
                key={index}
                variants={getReducedMotionVariants(itemVariants)}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
      </motion.span>
    </Tag>
  )
}

/**
 * Floating animation component
 */
export function FloatingElement({
  children,
  intensity = 10,
  duration = 3,
  className = '',
}: {
  children: React.ReactNode
  intensity?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -intensity, 0],
        x: [0, intensity / 2, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  )
}