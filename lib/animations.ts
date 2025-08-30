/**
 * Animation library for conversion-focused micro-interactions
 * Provides consistent, accessible, and performance-optimized animations
 */

import { Variants } from 'framer-motion'

// Base animation configurations
export const animationConfig = {
  // Standard durations for consistency
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    verySlow: 0.8,
  },
  
  // Easing functions
  ease: {
    smooth: [0.4, 0, 0.2, 1] as const,
    bounce: [0.68, -0.55, 0.265, 1.55] as const,
    sharp: [0.4, 0, 1, 1] as const,
    linear: [0, 0, 1, 1] as const,
  },

  // Spring configurations
  spring: {
    gentle: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
    bouncy: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 12,
    },
    snappy: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },

  // Stagger configurations
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.2,
  },
} as const

// Page transition variants
export const pageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
      staggerChildren: animationConfig.stagger.normal,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.sharp,
    },
  },
}

// Container variants for staggered children
export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: animationConfig.stagger.normal,
      delayChildren: 0.1,
    },
  },
}

// Item variants for staggered animations
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
}

// Fade in variants
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
}

// Scale in variants for buttons and cards
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
}

// Slide in from direction variants
export const slideInVariants = {
  fromLeft: {
    hidden: {
      opacity: 0,
      x: -50,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: animationConfig.duration.normal,
        ease: animationConfig.ease.smooth,
      },
    },
  },
  fromRight: {
    hidden: {
      opacity: 0,
      x: 50,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: animationConfig.duration.normal,
        ease: animationConfig.ease.smooth,
      },
    },
  },
  fromTop: {
    hidden: {
      opacity: 0,
      y: -50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: animationConfig.duration.normal,
        ease: animationConfig.ease.smooth,
      },
    },
  },
  fromBottom: {
    hidden: {
      opacity: 0,
      y: 50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: animationConfig.duration.normal,
        ease: animationConfig.ease.smooth,
      },
    },
  },
} as const

// Button interaction variants
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.smooth,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.smooth,
    },
  },
}

// Card hover variants
export const cardHoverVariants: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    y: -4,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
}

// Loading spinner variants
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

// Progress bar variants
export const progressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: (progress: number) => ({
    scaleX: progress / 100,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  }),
}

// Modal/overlay variants
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.sharp,
    },
  },
}

// Backdrop variants for modals
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: animationConfig.duration.normal,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: animationConfig.duration.fast,
    },
  },
}

// Form step transition variants
export const formStepVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.sharp,
    },
  },
}

// Success/error message variants
export const messageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.bounce,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.sharp,
    },
  },
}

// Count up animation for numbers
export const countUpVariants: Variants = {
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.6,
      ease: animationConfig.ease.bounce,
    },
  },
}

// Pulse animation for attention-grabbing elements
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      ease: animationConfig.ease.smooth,
      repeat: Infinity,
    },
  },
}

// Floating animation for decorative elements
export const floatVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      ease: animationConfig.ease.smooth,
      repeat: Infinity,
    },
  },
}

// Scroll-triggered animation variants
export const scrollVariants = {
  offscreen: {
    opacity: 0,
    y: 50,
  },
  onscreen: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.slow,
      ease: animationConfig.ease.smooth,
    },
  },
} as const

// Custom hook for reduced motion preferences
export const getReducedMotionVariants = (variants: Variants): Variants => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Return simplified variants with no transforms, only opacity
    return Object.keys(variants).reduce((acc, key) => {
      const variant = variants[key]
      if (typeof variant === 'object' && variant !== null) {
        acc[key] = {
          opacity: 'opacity' in variant ? variant.opacity : 1,
          transition: {
            duration: animationConfig.duration.fast,
          },
        }
      } else {
        acc[key] = variant
      }
      return acc
    }, {} as Variants)
  }
  return variants
}

// Utility functions for common animation patterns
export const animationUtils = {
  // Create a staggered container with custom timing
  createStaggerContainer: (staggerDelay = animationConfig.stagger.normal, childDelay = 0.1): Variants => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: childDelay,
      },
    },
  }),

  // Create a slide-and-fade animation from any direction
  createSlideIn: (
    direction: 'left' | 'right' | 'top' | 'bottom',
    distance = 50,
    duration = animationConfig.duration.normal
  ): Variants => {
    const transforms = {
      left: { x: -distance },
      right: { x: distance },
      top: { y: -distance },
      bottom: { y: distance },
    }

    return {
      hidden: {
        opacity: 0,
        ...transforms[direction],
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration,
          ease: animationConfig.ease.smooth,
        },
      },
    }
  },

  // Create a scale animation with custom parameters
  createScale: (
    fromScale = 0.95,
    toScale = 1,
    duration = animationConfig.duration.normal
  ): Variants => ({
    hidden: {
      opacity: 0,
      scale: fromScale,
    },
    visible: {
      opacity: 1,
      scale: toScale,
      transition: {
        duration,
        ease: animationConfig.ease.smooth,
      },
    },
  }),

  // Create a bounce-in animation
  createBounceIn: (duration = animationConfig.duration.slow): Variants => ({
    hidden: {
      opacity: 0,
      scale: 0.3,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration,
        ease: animationConfig.ease.bounce,
      },
    },
  }),
}