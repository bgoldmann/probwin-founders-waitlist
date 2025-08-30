'use client'

import { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  HelpCircle,
  DollarSign,
  Clock,
  Shield,
  MessageCircle,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FAQ_ITEMS } from '../../lib/constants'
import { cn } from '../../lib/utils'

interface FAQProps {
  className?: string
}

interface FAQCategory {
  id: string
  name: string
  icon: React.ReactNode
  color: string
}

const faqCategories: FAQCategory[] = [
  {
    id: 'payment',
    name: 'Payment & Refunds',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'process',
    name: 'Application Process',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'timeline',
    name: 'Timeline & Decisions',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    id: 'membership',
    name: 'Membership Details',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  }
]

// Categorize FAQ items
const categorizedFAQs = {
  payment: FAQ_ITEMS.filter(item => 
    item.question.toLowerCase().includes('$99') || 
    item.question.toLowerCase().includes('$199') ||
    item.question.toLowerCase().includes('refund') ||
    item.question.toLowerCase().includes('pricing')
  ),
  process: FAQ_ITEMS.filter(item => 
    item.question.toLowerCase().includes('accept') ||
    item.question.toLowerCase().includes('place') ||
    item.question.toLowerCase().includes('fairness')
  ),
  timeline: FAQ_ITEMS.filter(item => 
    item.question.toLowerCase().includes('decision') ||
    item.question.toLowerCase().includes('activate') ||
    item.question.toLowerCase().includes('long')
  ),
  membership: FAQ_ITEMS.filter(item => 
    !item.question.toLowerCase().includes('$99') && 
    !item.question.toLowerCase().includes('$199') &&
    !item.question.toLowerCase().includes('refund') &&
    !item.question.toLowerCase().includes('pricing') &&
    !item.question.toLowerCase().includes('accept') &&
    !item.question.toLowerCase().includes('place') &&
    !item.question.toLowerCase().includes('fairness') &&
    !item.question.toLowerCase().includes('decision') &&
    !item.question.toLowerCase().includes('activate') &&
    !item.question.toLowerCase().includes('long')
  )
}

/**
 * FAQ section with search, categories, and accessibility features
 * Optimized for conversion and user confidence building
 */
export function FAQ({ className = '' }: FAQProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['faq-0'])) // First item open by default
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Filter FAQs based on search and category
  const filteredFAQs = (() => {
    let items = selectedCategory === 'all' 
      ? FAQ_ITEMS 
      : categorizedFAQs[selectedCategory as keyof typeof categorizedFAQs] || []

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      items = items.filter(item => 
        item.question.toLowerCase().includes(search) ||
        item.answer.toLowerCase().includes(search)
      )
    }

    return items
  })()

  const toggleItem = (itemId: string) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(itemId)) {
      newOpenItems.delete(itemId)
    } else {
      newOpenItems.add(itemId)
    }
    setOpenItems(newOpenItems)
  }

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

  const contentVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut'
      }
    },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  }

  return (
    <section 
      className={cn("py-16 lg:py-20 bg-white", className)}
      aria-labelledby="faq-title"
    >
      <div className="container mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <HelpCircle className="w-6 h-6 text-orange-600" />
              <Badge variant="secondary" className="text-sm">
                Common Questions
              </Badge>
            </div>
            <h2 id="faq-title" className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get answers to the most common questions about our FastTrack waitlist process.
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div variants={itemVariants} className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
                aria-label="Search FAQ questions"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                  selectedCategory === 'all'
                    ? "bg-orange-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
                aria-pressed={selectedCategory === 'all'}
              >
                All Questions
              </button>
              {faqCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border transition-colors",
                    selectedCategory === category.id
                      ? category.color
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  )}
                  aria-pressed={selectedCategory === category.id}
                >
                  {category.icon}
                  {category.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* FAQ Items */}
          <motion.div variants={containerVariants} className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <motion.div 
                variants={itemVariants}
                className="text-center py-12"
              >
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No questions found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or category filter.
                </p>
              </motion.div>
            ) : (
              filteredFAQs.map((item, index) => {
                const itemId = `faq-${index}`
                const isOpen = openItems.has(itemId)
                
                return (
                  <motion.div key={itemId} variants={itemVariants}>
                    <Card className="border border-gray-200 hover:border-orange-200 transition-colors">
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
                        aria-expanded={isOpen}
                        aria-controls={`${itemId}-content`}
                        id={`${itemId}-trigger`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {item.question}
                              </h3>
                              {/* Preview of answer when closed */}
                              {!isOpen && (
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {item.answer.substring(0, 100)}...
                                </p>
                              )}
                            </div>
                            <div className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                              isOpen 
                                ? "bg-orange-600 text-white" 
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}>
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </button>

                      {/* Answer Content */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            id={`${itemId}-content`}
                            role="region"
                            aria-labelledby={`${itemId}-trigger`}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="overflow-hidden"
                          >
                            <CardContent className="px-6 pb-6 pt-0">
                              <div className="border-t border-gray-100 pt-4">
                                <div className="prose prose-sm max-w-none">
                                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {item.answer}
                                  </p>
                                </div>
                                
                                {/* Related actions for specific questions */}
                                {item.question.toLowerCase().includes('fasttrack fee') && (
                                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-orange-800">
                                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm font-medium">
                                        Ready to get started? Choose your FastTrack tier above.
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {item.question.toLowerCase().includes('refund') && (
                                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-800">
                                      <Shield className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm font-medium">
                                        100% risk-free guarantee - we stand behind our process.
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </motion.div>

          {/* Contact Section */}
          <motion.div variants={itemVariants} className="mt-12">
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Still have questions?
                </h3>
                <p className="text-gray-600 mb-4">
                  Our team is here to help you understand the process and make the right decision.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="mailto:support@probwin.ai"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Email Support
                  </a>
                  <span className="text-sm text-gray-600">
                    Average response time: 4 hours
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div variants={itemVariants} className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span>PCI DSS Certified</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}