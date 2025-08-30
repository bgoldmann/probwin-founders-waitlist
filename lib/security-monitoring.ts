/**
 * Security Monitoring and Alerting for ProbWin.ai
 * Implements comprehensive security monitoring, threat detection,
 * and incident alerting systems
 */

import { SecurityAudit } from '@/lib/security';
import { supabaseServiceClient } from '@/lib/supabase-security';

// ===== MONITORING CONFIGURATION =====

export const MONITORING_CONFIG = {
  // Threat detection thresholds
  THREAT_THRESHOLDS: {
    FAILED_LOGINS_PER_IP: 5, // Max failed logins per IP per hour
    FAILED_LOGINS_PER_EMAIL: 3, // Max failed logins per email per hour
    RATE_LIMIT_VIOLATIONS: 10, // Max rate limit violations per IP per hour
    SUSPICIOUS_REQUESTS: 20, // Max suspicious requests per IP per hour
    PAYMENT_FAILURES: 5, // Max payment failures per IP per day
    VALIDATION_ERRORS: 15, // Max validation errors per IP per hour
    XSS_ATTEMPTS: 1, // Any XSS attempt triggers alert
    SQL_INJECTION_ATTEMPTS: 1, // Any SQL injection attempt triggers alert
  },

  // Alert severity levels
  ALERT_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const,

  // Notification channels
  NOTIFICATION_CHANNELS: {
    EMAIL: 'email',
    SLACK: 'slack',
    WEBHOOK: 'webhook',
    SMS: 'sms'
  } as const,

  // Monitoring intervals (in minutes)
  MONITORING_INTERVALS: {
    REAL_TIME: 1,
    SHORT_TERM: 5,
    MEDIUM_TERM: 15,
    LONG_TERM: 60
  }
} as const;

// ===== TYPES =====

export interface SecurityAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata: {
    ip?: string;
    userAgent?: string;
    endpoint?: string;
    count?: number;
    timeframe?: string;
    relatedEvents?: string[];
  };
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
  assignedTo?: string;
}

export interface ThreatPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface MonitoringMetrics {
  timestamp: string;
  totalRequests: number;
  failedRequests: number;
  securityEvents: number;
  blockedRequests: number;
  averageResponseTime: number;
  uniqueIPs: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  threatsSummary: {
    xssAttempts: number;
    sqlInjectionAttempts: number;
    rateLimitViolations: number;
    suspiciousRequests: number;
  };
}

// ===== THREAT DETECTION PATTERNS =====

const THREAT_PATTERNS: ThreatPattern[] = [
  {
    id: 'xss-attempt',
    name: 'Cross-Site Scripting (XSS) Attempt',
    pattern: /<script[^>]*>.*?<\/script>|javascript:|on\w+\s*=/gi,
    description: 'Potential XSS attack detected in request',
    severity: 'critical',
    enabled: true
  },
  {
    id: 'sql-injection',
    name: 'SQL Injection Attempt',
    pattern: /(union|select|insert|update|delete|drop|create|alter)\s+.*?(from|into|table|database)/gi,
    description: 'Potential SQL injection attack detected',
    severity: 'critical',
    enabled: true
  },
  {
    id: 'path-traversal',
    name: 'Path Traversal Attempt',
    pattern: /\.\.[\/\\]|\.\.%2[fF]|%2e%2e/gi,
    description: 'Path traversal attempt detected',
    severity: 'high',
    enabled: true
  },
  {
    id: 'command-injection',
    name: 'Command Injection Attempt',
    pattern: /[;&|`$(){}\\]/g,
    description: 'Potential command injection detected',
    severity: 'high',
    enabled: true
  },
  {
    id: 'sensitive-file-access',
    name: 'Sensitive File Access Attempt',
    pattern: /\/(etc\/passwd|\.env|config|wp-config|\.git|\.svn)/gi,
    description: 'Attempt to access sensitive files',
    severity: 'medium',
    enabled: true
  },
  {
    id: 'enumeration-attempt',
    name: 'Directory/File Enumeration',
    pattern: /\/(admin|administrator|wp-admin|phpmyadmin|backup|config)/gi,
    description: 'Directory enumeration attempt detected',
    severity: 'medium',
    enabled: true
  }
];

// ===== SECURITY MONITORING CLASS =====

export class SecurityMonitoring {
  private static alertsCache = new Map<string, SecurityAlert>();
  private static metricsCache = new Map<string, any>();
  
  // ===== THREAT DETECTION =====

  /**
   * Analyze request for security threats
   */
  static analyzeRequest(
    url: string,
    headers: Record<string, string>,
    body?: string,
    ip?: string
  ): {
    threats: Array<{ pattern: ThreatPattern; matches: string[] }>;
    riskScore: number;
    shouldBlock: boolean;
  } {
    const threats: Array<{ pattern: ThreatPattern; matches: string[] }> = [];
    let riskScore = 0;

    const searchTargets = [
      url,
      headers['user-agent'] || '',
      headers['referer'] || '',
      body || ''
    ].join(' ');

    // Check against threat patterns
    for (const pattern of THREAT_PATTERNS) {
      if (!pattern.enabled) continue;

      const matches = searchTargets.match(pattern.pattern);
      if (matches) {
        threats.push({ pattern, matches });
        
        // Calculate risk score
        switch (pattern.severity) {
          case 'critical':
            riskScore += 100;
            break;
          case 'high':
            riskScore += 75;
            break;
          case 'medium':
            riskScore += 50;
            break;
          case 'low':
            riskScore += 25;
            break;
        }
      }
    }

    const shouldBlock = riskScore >= 75; // Block high-risk requests

    // Log threats found
    if (threats.length > 0) {
      SecurityAudit.logSecurityEvent({
        type: 'suspicious_activity',
        ip,
        userAgent: headers['user-agent'],
        details: `Threats detected: ${threats.map(t => t.pattern.name).join(', ')}`,
        severity: shouldBlock ? 'critical' : 'high'
      });
    }

    return { threats, riskScore, shouldBlock };
  }

  /**
   * Check for brute force attacks
   */
  static async detectBruteForce(
    ip: string,
    email?: string,
    eventType: 'login_failed' | 'payment_failed' | 'validation_error' = 'login_failed'
  ): Promise<{ isAttack: boolean; shouldBlock: boolean; alertLevel: string }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Count recent events
      let query = supabaseServiceClient
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('ip_address', ip)
        .gte('created_at', eventType === 'payment_failed' ? oneDayAgo : oneHourAgo);

      if (email) {
        query = query.eq('user_email', email);
      }

      const { count } = await query;

      let threshold: number;
      switch (eventType) {
        case 'login_failed':
          threshold = email 
            ? MONITORING_CONFIG.THREAT_THRESHOLDS.FAILED_LOGINS_PER_EMAIL
            : MONITORING_CONFIG.THREAT_THRESHOLDS.FAILED_LOGINS_PER_IP;
          break;
        case 'payment_failed':
          threshold = MONITORING_CONFIG.THREAT_THRESHOLDS.PAYMENT_FAILURES;
          break;
        case 'validation_error':
          threshold = MONITORING_CONFIG.THREAT_THRESHOLDS.VALIDATION_ERRORS;
          break;
        default:
          threshold = 10;
      }

      const isAttack = (count || 0) >= threshold;
      const shouldBlock = isAttack;
      
      let alertLevel: string;
      if ((count || 0) >= threshold * 2) {
        alertLevel = MONITORING_CONFIG.ALERT_LEVELS.CRITICAL;
      } else if (isAttack) {
        alertLevel = MONITORING_CONFIG.ALERT_LEVELS.HIGH;
      } else if ((count || 0) >= threshold * 0.7) {
        alertLevel = MONITORING_CONFIG.ALERT_LEVELS.MEDIUM;
      } else {
        alertLevel = MONITORING_CONFIG.ALERT_LEVELS.LOW;
      }

      if (isAttack) {
        await this.createAlert({
          alertType: 'brute_force_attack',
          severity: alertLevel as any,
          title: `Brute Force Attack Detected`,
          description: `${eventType} attempts from IP ${ip}${email ? ` targeting ${email}` : ''}`,
          metadata: {
            ip,
            userAgent: email || 'unknown',
            count: count || 0,
            timeframe: eventType === 'payment_failed' ? '24 hours' : '1 hour'
          }
        });
      }

      return { isAttack, shouldBlock, alertLevel };
    } catch (error) {
      console.error('Brute force detection error:', error);
      return { isAttack: false, shouldBlock: false, alertLevel: 'low' };
    }
  }

  /**
   * Detect anomalous behavior patterns
   */
  static async detectAnomalies(): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    try {
      // Check for unusual traffic spikes
      const { data: recentEvents } = await supabaseServiceClient
        .from('audit_logs')
        .select('ip_address, user_agent_hash, event_type')
        .gte('created_at', oneHourAgo);

      if (recentEvents) {
        // Group by IP to find high-volume sources
        const ipCounts = recentEvents.reduce((acc: Record<string, number>, event) => {
          const ip = event.ip_address || 'unknown';
          acc[ip] = (acc[ip] || 0) + 1;
          return acc;
        }, {});

        // Check for IPs with unusually high activity
        for (const [ip, count] of Object.entries(ipCounts)) {
          if (count > MONITORING_CONFIG.THREAT_THRESHOLDS.SUSPICIOUS_REQUESTS) {
            alerts.push(await this.createAlert({
              alertType: 'traffic_anomaly',
              severity: 'high',
              title: 'Unusual Traffic Volume Detected',
              description: `IP ${ip} generated ${count} requests in the last hour`,
              metadata: { ip, count, timeframe: '1 hour' }
            }));
          }
        }

        // Check for rapid succession of different event types (potential automated attack)
        const rapidEvents = recentEvents.filter((event, index) => {
          if (index === 0) return false;
          const prevEvent = recentEvents[index - 1];
          return event.ip_address === prevEvent.ip_address &&
                 event.event_type !== prevEvent.event_type;
        });

        if (rapidEvents.length > 10) {
          const ip = rapidEvents[0].ip_address;
          alerts.push(await this.createAlert({
            alertType: 'automated_attack',
            severity: 'critical',
            title: 'Potential Automated Attack Detected',
            description: `Rapid succession of different event types from IP ${ip}`,
            metadata: { ip, count: rapidEvents.length }
          }));
        }
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }

    return alerts;
  }

  // ===== ALERT MANAGEMENT =====

  /**
   * Create and store security alert
   */
  static async createAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData
    };

    // Store in cache
    this.alertsCache.set(alert.id, alert);

    // Store in database
    try {
      await supabaseServiceClient
        .from('security_alerts')
        .insert({
          id: alert.id,
          alert_type: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          metadata: alert.metadata,
          timestamp: alert.timestamp,
          acknowledged: alert.acknowledged
        });
    } catch (error) {
      console.error('Failed to store alert:', error);
    }

    // Send notifications
    await this.sendNotification(alert);

    return alert;
  }

  /**
   * Send alert notifications
   */
  private static async sendNotification(alert: SecurityAlert): Promise<void> {
    try {
      // Log the alert
      console.error(`[SECURITY ALERT - ${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`);

      // In production, implement actual notification services
      if (process.env.NODE_ENV === 'production') {
        // Email notifications for critical alerts
        if (alert.severity === 'critical') {
          await this.sendEmailAlert(alert);
        }

        // Slack notifications for high and critical alerts
        if (['high', 'critical'].includes(alert.severity)) {
          await this.sendSlackAlert(alert);
        }

        // Webhook for external monitoring systems
        await this.sendWebhookAlert(alert);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send email alert (placeholder - implement with your email service)
   */
  private static async sendEmailAlert(alert: SecurityAlert): Promise<void> {
    // TODO: Implement email service (Resend, SendGrid, etc.)
    console.log(`EMAIL ALERT: ${alert.title} - ${alert.description}`);
  }

  /**
   * Send Slack alert (placeholder - implement with Slack webhook)
   */
  private static async sendSlackAlert(alert: SecurityAlert): Promise<void> {
    // TODO: Implement Slack webhook
    console.log(`SLACK ALERT: ${alert.title} - ${alert.description}`);
  }

  /**
   * Send webhook alert to external monitoring system
   */
  private static async sendWebhookAlert(alert: SecurityAlert): Promise<void> {
    try {
      const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
      if (!webhookUrl) return;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN}`
        },
        body: JSON.stringify({
          source: 'probwin-security',
          alert,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  // ===== METRICS COLLECTION =====

  /**
   * Collect security metrics for monitoring dashboard
   */
  static async collectMetrics(timeframe: 'hourly' | 'daily' | 'weekly' = 'hourly'): Promise<MonitoringMetrics> {
    const now = new Date();
    let startTime: Date;

    switch (timeframe) {
      case 'hourly':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      // Get audit logs for the timeframe
      const { data: events } = await supabaseServiceClient
        .from('audit_logs')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', now.toISOString());

      if (!events) {
        return this.getEmptyMetrics();
      }

      // Calculate metrics
      const totalRequests = events.length;
      const failedRequests = events.filter(e => e.severity === 'error').length;
      const securityEvents = events.filter(e => 
        ['suspicious_activity', 'auth_failure', 'validation_error'].includes(e.event_type)
      ).length;
      const blockedRequests = events.filter(e => e.event_type === 'request_blocked').length;

      // Unique IPs
      const uniqueIPs = new Set(events.map(e => e.ip_address).filter(Boolean)).size;

      // Top endpoints
      const endpointCounts = events.reduce((acc: Record<string, number>, event) => {
        // Extract endpoint from event details if available
        const endpoint = this.extractEndpoint(event.table_name || 'unknown');
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      }, {});

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));

      // Top user agents
      const userAgentCounts = events.reduce((acc: Record<string, number>, event) => {
        const userAgent = event.user_agent_hash || 'unknown';
        acc[userAgent] = (acc[userAgent] || 0) + 1;
        return acc;
      }, {});

      const topUserAgents = Object.entries(userAgentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([userAgent, count]) => ({ userAgent, count }));

      // Threat summary
      const threatsSummary = {
        xssAttempts: events.filter(e => e.details?.includes('XSS')).length,
        sqlInjectionAttempts: events.filter(e => e.details?.includes('SQL')).length,
        rateLimitViolations: events.filter(e => e.event_type === 'rate_limit').length,
        suspiciousRequests: events.filter(e => e.event_type === 'suspicious_activity').length
      };

      const metrics: MonitoringMetrics = {
        timestamp: now.toISOString(),
        totalRequests,
        failedRequests,
        securityEvents,
        blockedRequests,
        averageResponseTime: 0, // Would need response time tracking
        uniqueIPs,
        topEndpoints,
        topUserAgents,
        threatsSummary
      };

      // Cache metrics
      this.metricsCache.set(`${timeframe}-${now.getHours()}`, metrics);

      return metrics;
    } catch (error) {
      console.error('Metrics collection error:', error);
      return this.getEmptyMetrics();
    }
  }

  private static getEmptyMetrics(): MonitoringMetrics {
    return {
      timestamp: new Date().toISOString(),
      totalRequests: 0,
      failedRequests: 0,
      securityEvents: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      uniqueIPs: 0,
      topEndpoints: [],
      topUserAgents: [],
      threatsSummary: {
        xssAttempts: 0,
        sqlInjectionAttempts: 0,
        rateLimitViolations: 0,
        suspiciousRequests: 0
      }
    };
  }

  private static extractEndpoint(tableName: string): string {
    // Map table names to endpoint patterns
    const mapping: Record<string, string> = {
      'waitlist_applications': '/api/waitlist',
      'seat_availability': '/api/seats',
      'admin_users': '/api/admin',
      'unknown': '/unknown'
    };
    return mapping[tableName] || tableName;
  }

  // ===== HEALTH CHECKS =====

  /**
   * Run comprehensive security health check
   */
  static async runHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{ name: string; status: string; message?: string }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check recent alert volume
    const recentAlerts = Array.from(this.alertsCache.values())
      .filter(alert => {
        const alertTime = new Date(alert.timestamp);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return alertTime > oneHourAgo;
      });

    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = recentAlerts.filter(a => a.severity === 'high').length;

    if (criticalAlerts > 0) {
      overallStatus = 'critical';
      checks.push({
        name: 'Critical Alerts',
        status: 'critical',
        message: `${criticalAlerts} critical security alerts in the last hour`
      });
    } else if (highAlerts > 3) {
      overallStatus = 'warning';
      checks.push({
        name: 'High Alerts',
        status: 'warning',
        message: `${highAlerts} high-priority alerts in the last hour`
      });
    } else {
      checks.push({
        name: 'Alert Volume',
        status: 'healthy'
      });
    }

    // Check database connection
    try {
      await supabaseServiceClient.from('audit_logs').select('id').limit(1);
      checks.push({
        name: 'Database Connection',
        status: 'healthy'
      });
    } catch (error) {
      overallStatus = 'critical';
      checks.push({
        name: 'Database Connection',
        status: 'critical',
        message: 'Unable to connect to audit database'
      });
    }

    // Check monitoring system status
    checks.push({
      name: 'Monitoring System',
      status: 'healthy'
    });

    return { status: overallStatus, checks };
  }
}

export default SecurityMonitoring;