/**
 * Mock data service for development and testing
 * Returns realistic data that matches the expected API responses
 */

export interface MockSeatData {
  tier_99_available: number
  tier_199_available: number
  tier_99_total: number
  tier_199_total: number
  last_updated: string
}

export interface MockWaveData {
  wave: number
  tier: string
  total_seats: number
  filled_seats: number
  available_seats: number
  fill_percentage: number
  last_updated: string
}

/**
 * Mock seat data with realistic scarcity levels
 */
export const mockSeatData: MockSeatData = {
  tier_99_available: 23,  // High scarcity to create urgency
  tier_199_available: 8,  // Very high scarcity
  tier_99_total: 100,
  tier_199_total: 50,
  last_updated: new Date().toISOString(),
}

/**
 * Mock wave data for database queries
 */
export const mockWaveData: MockWaveData[] = [
  {
    wave: 1,
    tier: '99',
    total_seats: 100,
    filled_seats: 77,
    available_seats: 23,
    fill_percentage: 77.0,
    last_updated: new Date().toISOString(),
  },
  {
    wave: 2,
    tier: '199', 
    total_seats: 50,
    filled_seats: 42,
    available_seats: 8,
    fill_percentage: 84.0,
    last_updated: new Date().toISOString(),
  },
]

/**
 * Simulate seat availability changing over time
 * Reduces available seats slightly on each call to create urgency
 */
let seatReductionCounter = 0;

export function getDynamicMockSeatData(): MockSeatData {
  // Reduce seats every few calls to simulate real bookings
  const reductionFactor = Math.floor(seatReductionCounter / 3);
  
  return {
    tier_99_available: Math.max(1, mockSeatData.tier_99_available - reductionFactor),
    tier_199_available: Math.max(1, mockSeatData.tier_199_available - Math.floor(reductionFactor / 2)),
    tier_99_total: mockSeatData.tier_99_total,
    tier_199_total: mockSeatData.tier_199_total,
    last_updated: new Date().toISOString(),
  }
}

/**
 * Mock application submission response
 */
export const mockApplicationResponse = {
  success: true,
  data: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    status: 'pending',
    wave_type: 'fasttrack',
    wave_number: 1,
    created_at: new Date().toISOString(),
  },
  message: 'Application submitted successfully'
}

/**
 * Mock Stripe checkout session response
 */
export const mockCheckoutResponse = {
  checkoutUrl: 'https://checkout.stripe.com/pay/test_session',
  sessionId: 'cs_test_123456789',
}

/**
 * Environment detection utility
 */
export const isDevelopment = process.env.NODE_ENV === 'development'
export const useMockData = isDevelopment && !process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Increment counter for dynamic mock data
 */
export function incrementSeatReduction() {
  seatReductionCounter++
}