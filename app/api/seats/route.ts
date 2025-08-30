/**
 * Seats API Route - Secure implementation
 * Provides real-time seat availability data with security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { publicApi } from '../../../lib/api-security';
import { SupabaseSecureOperations } from '../../../lib/supabase-security';
import { SecurityAudit } from '../../../lib/security';
import { getDynamicMockSeatData, incrementSeatReduction, useMockData } from '../../../lib/mock-data';

/**
 * GET /api/seats
 * Returns current seat availability for all waves
 */
export const GET = publicApi(async (context) => {
  try {
    // Use mock data in development if database is not available
    if (useMockData) {
      console.log('🔄 Using mock data for development');
      incrementSeatReduction();
      const mockData = getDynamicMockSeatData();
      
      return NextResponse.json(mockData, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'Last-Modified': new Date().toUTCString(),
        }
      });
    }

    // Get seat availability from secure database operations
    const result = await SupabaseSecureOperations.getSeatAvailability();

    if (!result.success || !result.data) {
      SecurityAudit.logSecurityEvent({
        type: 'validation_error',
        ip: context.ip,
        userAgent: context.userAgent,
        details: 'Failed to retrieve seat availability',
        severity: 'medium'
      });

      // Fallback to mock data if database fails
      console.log('⚠️ Database unavailable, using fallback mock data');
      incrementSeatReduction();
      const mockData = getDynamicMockSeatData();
      
      return NextResponse.json(mockData, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
          'Last-Modified': new Date().toUTCString(),
        }
      });
    }

    // Transform data for client consumption matching TierSelector expectations
    const waves = result.data;
    const tier99Wave = waves.find(w => w.wave_number === 1);
    const tier199Wave = waves.find(w => w.wave_number === 2);
    
    const seatData = {
      tier_99_available: tier99Wave ? tier99Wave.total_seats - tier99Wave.filled_seats : 0,
      tier_199_available: tier199Wave ? tier199Wave.total_seats - tier199Wave.filled_seats : 0,
      tier_99_total: tier99Wave ? tier99Wave.total_seats : 100,
      tier_199_total: tier199Wave ? tier199Wave.total_seats : 50,
      last_updated: new Date().toISOString()
    };

    // Return with caching headers for performance
    return NextResponse.json(seatData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', // Cache for 1 minute
        'Last-Modified': new Date().toUTCString(),
      }
    });

  } catch (error) {
    SecurityAudit.logSecurityEvent({
      type: 'suspicious_activity',
      ip: context.ip,
      userAgent: context.userAgent,
      details: `Seats API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'high'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, {
  rateLimit: 'lenient' // Allow frequent polling
});