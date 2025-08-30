# Security Configuration Checklist
## ProbWin.ai Founders Waitlist Platform

> **CRITICAL**: Complete all items before deploying to production. This checklist ensures your financial application meets security and compliance requirements.

## 📋 Pre-Deployment Security Checklist

### 🔧 Environment Variables & Secrets

#### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Keep secret!

# Stripe Configuration  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_ for testing
STRIPE_SECRET_KEY=sk_live_... # Keep secret!
STRIPE_WEBHOOK_SECRET=whsec_... # Keep secret!
STRIPE_FASTTRACK_PRICE_ID=price_...
STRIPE_FASTTRACK_PLUS_PRICE_ID=price_...

# Security Configuration
ADMIN_SECRET_KEY=your-super-secure-admin-key # Generate 64-char random string
HCAPTCHA_SECRET_KEY=your-hcaptcha-secret # Keep secret!
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-hcaptcha-site-key

# Optional Monitoring
SECURITY_WEBHOOK_URL=https://your-monitoring-service.com/webhook
SECURITY_WEBHOOK_TOKEN=your-webhook-token
```

#### ✅ Environment Variable Security Checklist
- [ ] All secrets use strong, randomly generated values (minimum 32 characters)
- [ ] No hardcoded secrets in source code
- [ ] Environment variables properly configured in Vercel dashboard
- [ ] Separate values for development/staging/production
- [ ] Regular rotation schedule established (quarterly minimum)
- [ ] Access to environment variables restricted to authorized personnel only

### 🗄️ Database Security Setup

#### Supabase RLS Configuration
1. **Execute Security SQL Script**
   ```bash
   # Apply the comprehensive RLS policies
   psql -h db.your-project.supabase.co -U postgres -d postgres -f lib/supabase-security.sql
   ```

2. **Verify RLS is Enabled**
   ```sql
   -- Check that RLS is enabled on all tables
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('waitlist_applications', 'admin_users', 'audit_logs', 'seat_availability');
   ```

#### ✅ Database Security Checklist
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Appropriate RLS policies created and tested
- [ ] Service role key properly secured
- [ ] Database connection uses SSL/TLS encryption
- [ ] Audit logging functions installed and working
- [ ] Data retention policies configured
- [ ] GDPR compliance functions installed
- [ ] Database backups configured and encrypted
- [ ] Access logs monitored

### 💳 Payment Security (Stripe) Setup

#### Stripe Configuration Steps
1. **Create Products and Prices**
   ```javascript
   // In Stripe Dashboard or via API:
   const fastTrackProduct = await stripe.products.create({
     name: 'FastTrack Application Fee',
     description: 'Application processing fee for FastTrack program'
   });
   
   const fastTrackPrice = await stripe.prices.create({
     unit_amount: 9900, // $99.00
     currency: 'usd',
     product: fastTrackProduct.id,
   });
   ```

2. **Configure Webhooks**
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

3. **Test Payment Flow**
   ```bash
   # Use Stripe CLI for testing
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   
   # Test with test card numbers
   # 4242424242424242 - Success
   # 4000000000000002 - Declined
   ```

#### ✅ Stripe Security Checklist  
- [ ] Webhook signature verification implemented and tested
- [ ] Payment amounts validated server-side
- [ ] PCI DSS compliance measures documented
- [ ] Test mode thoroughly tested before going live
- [ ] Price IDs correctly configured in environment variables
- [ ] Payment failure handling implemented
- [ ] Refund procedures documented
- [ ] Financial reconciliation process established

### 🛡️ API Security Implementation

#### Rate Limiting Configuration
```typescript
// Verify rate limiting is working
const rateLimits = {
  '/api/waitlist/apply': 'strict', // 3 requests per 15 minutes
  '/api/stripe/webhook': 'moderate', // 10 requests per 5 minutes  
  '/api/seats': 'lenient', // 60 requests per minute
  '/api/admin/*': 'strict', // 5 requests per 15 minutes
};
```

#### Input Validation Testing
```bash
# Test XSS protection
curl -X POST https://your-app.com/api/waitlist/apply \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@test.com"}'
# Should return validation error, not execute script

# Test SQL injection protection  
curl -X POST https://your-app.com/api/waitlist/apply \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com; DROP TABLE users;--"}'
# Should return validation error
```

#### ✅ API Security Checklist
- [ ] Rate limiting implemented and tested on all endpoints
- [ ] Input validation working for all form fields
- [ ] XSS protection verified
- [ ] SQL injection protection verified
- [ ] CSRF tokens implemented for state-changing operations
- [ ] Authentication middleware working
- [ ] Authorization checks implemented
- [ ] API endpoints return appropriate HTTP status codes
- [ ] Sensitive data not exposed in error messages

### 🌐 Frontend Security Configuration

#### Content Security Policy Testing
```bash
# Check CSP headers
curl -I https://your-app.com
# Should include: Content-Security-Policy header

# Test that CSP blocks unauthorized scripts
# Open browser console on your site and try:
eval('console.log("CSP test")'); // Should be blocked
```

#### ✅ Frontend Security Checklist
- [ ] Content Security Policy (CSP) headers configured
- [ ] XSS protection headers present
- [ ] HTTPS enforced (HSTS headers)
- [ ] Secure cookies configuration
- [ ] Client-side input validation implemented
- [ ] Sensitive data not stored in localStorage
- [ ] Error handling doesn't expose sensitive information
- [ ] Source maps disabled in production
- [ ] Debug information removed from production build

### 🔐 Authentication & Authorization

#### Admin Access Setup
1. **Create Admin Users**
   ```sql
   -- Insert admin users into admin_users table
   INSERT INTO public.admin_users (user_id, email, role, permissions, is_active)
   VALUES 
     ('admin-user-uuid', 'admin@probwin.ai', 'super_admin', '{"all": true}', true),
     ('viewer-user-uuid', 'support@probwin.ai', 'viewer', '{"view_applications": true}', true);
   ```

2. **Test Admin Authentication**
   ```bash
   # Test admin endpoint access
   curl -X GET https://your-app.com/api/admin/applications \
     -H "X-Admin-Token: your-admin-secret-key"
   # Should return application data for valid admin
   ```

#### ✅ Authentication & Authorization Checklist
- [ ] Admin secret key generated and stored securely
- [ ] Admin user roles and permissions configured
- [ ] Admin authentication tested
- [ ] Regular user authentication flow tested
- [ ] Session management implemented correctly
- [ ] Password policies enforced (if applicable)
- [ ] Multi-factor authentication considered for admin accounts
- [ ] Account lockout policies implemented

### 📊 Monitoring & Logging Setup

#### Security Monitoring Configuration
```typescript
// Verify security monitoring is active
import { SecurityMonitoring } from '@/lib/security-monitoring';

// Test threat detection
const testRequest = {
  url: 'https://your-app.com/api/test?param=<script>alert(1)</script>',
  headers: { 'user-agent': 'test-agent' },
  body: '',
  ip: '127.0.0.1'
};

const analysis = SecurityMonitoring.analyzeRequest(
  testRequest.url,
  testRequest.headers,
  testRequest.body,
  testRequest.ip
);

console.log('Threats detected:', analysis.threats.length);
console.log('Should block:', analysis.shouldBlock);
```

#### ✅ Monitoring & Logging Checklist
- [ ] Security event logging implemented
- [ ] Audit trail captures all critical actions
- [ ] Log files properly secured and backed up
- [ ] Real-time alerting configured for critical events
- [ ] Log retention policies established
- [ ] Performance monitoring active
- [ ] Error tracking and reporting configured
- [ ] Security dashboard accessible to authorized personnel

### 📋 GDPR & Privacy Compliance

#### Privacy Controls Setup
```typescript
// Test GDPR functionality
import { GDPRCompliance } from '@/lib/gdpr-compliance';

// Test consent recording
const consent = await GDPRCompliance.recordConsent({
  email: 'test@example.com',
  consentTypes: ['data_processing', 'marketing_communications'],
  consentGiven: true,
  consentDate: new Date().toISOString()
});

console.log('Consent recorded:', consent.success);
```

#### ✅ GDPR Compliance Checklist
- [ ] Privacy policy published and accessible
- [ ] Consent management system implemented
- [ ] Data subject rights procedures established
- [ ] Data retention policies configured
- [ ] Data deletion procedures tested
- [ ] Data portability functionality implemented
- [ ] Consent withdrawal process working
- [ ] Privacy notices translated if serving EU users
- [ ] Data Processing Agreement (DPA) with vendors

### 🚨 Incident Response Preparation

#### Emergency Procedures Setup
1. **Emergency Contacts Configured**
   ```json
   {
     "security_lead": {
       "name": "[Name]",
       "email": "[Email]",
       "phone": "[Phone]"
     },
     "technical_lead": {
       "name": "[Name]", 
       "email": "[Email]",
       "phone": "[Phone]"
     }
   }
   ```

2. **Emergency Access Verified**
   ```bash
   # Test emergency admin access
   export EMERGENCY_ACCESS_TOKEN="your-emergency-token"
   # Verify emergency procedures work
   ```

#### ✅ Incident Response Checklist
- [ ] Incident response playbook reviewed and understood
- [ ] Emergency contact list updated and verified
- [ ] Emergency access procedures tested
- [ ] Backup and recovery procedures documented
- [ ] Communication templates prepared
- [ ] Legal and regulatory reporting procedures established
- [ ] Insurance contacts and policy details readily available
- [ ] Quarterly incident response drills scheduled

### 🧪 Security Testing

#### Automated Security Testing
```bash
# Run security scan with npm audit
npm audit --audit-level high

# Check for vulnerable dependencies
npm audit fix

# Run custom security tests
npm run test:security
```

#### Manual Security Testing
1. **Authentication Tests**
   - [ ] Test login with invalid credentials
   - [ ] Test session timeout
   - [ ] Test password reset flow (if applicable)

2. **Authorization Tests**
   - [ ] Test access to admin endpoints without admin token
   - [ ] Test access to user data from different user account
   - [ ] Test privilege escalation attempts

3. **Input Validation Tests**
   - [ ] Test XSS payloads in all input fields
   - [ ] Test SQL injection in all input fields  
   - [ ] Test file upload vulnerabilities (if applicable)
   - [ ] Test buffer overflow attempts

4. **Business Logic Tests**
   - [ ] Test duplicate application submissions
   - [ ] Test payment amount manipulation
   - [ ] Test wave capacity bypass attempts

#### ✅ Security Testing Checklist
- [ ] Automated vulnerability scanning completed
- [ ] Manual penetration testing completed
- [ ] Code security review completed
- [ ] Third-party security audit conducted (recommended)
- [ ] All critical and high severity issues resolved
- [ ] Security test results documented
- [ ] Regular security testing schedule established

### 🌍 Production Deployment Security

#### Vercel Configuration
```bash
# Set production environment variables
vercel env add STRIPE_SECRET_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ADMIN_SECRET_KEY production

# Configure security headers in vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

#### ✅ Production Security Checklist
- [ ] All environment variables properly configured
- [ ] HTTPS enforced across entire application
- [ ] Security headers configured in hosting platform
- [ ] CDN security features enabled
- [ ] Production domain verified and configured
- [ ] SSL/TLS certificate valid and properly configured
- [ ] DNS security measures implemented
- [ ] Monitoring and alerting active in production
- [ ] Backup and disaster recovery procedures tested

### 📞 Go-Live Security Verification

#### Final Security Checks
```bash
# SSL/TLS Configuration Check
curl -I https://your-production-domain.com
# Verify HTTPS redirect and security headers

# API Endpoint Security Check
curl -X POST https://your-production-domain.com/api/waitlist/apply \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return proper validation errors

# Database Security Check
# Verify RLS policies are active in production database
```

#### ✅ Go-Live Security Checklist
- [ ] All previous checklist items completed ✅
- [ ] Production environment matches staging environment
- [ ] Security monitoring active and alerts working
- [ ] Emergency procedures tested and ready
- [ ] Team trained on security procedures
- [ ] Insurance policies active and up-to-date
- [ ] Legal compliance verified
- [ ] Customer communication prepared
- [ ] Post-launch security monitoring plan active

---

## 🚀 Post-Deployment Security Maintenance

### Daily Security Tasks
- [ ] Review security alerts and logs
- [ ] Monitor system performance and availability
- [ ] Check for new security advisories
- [ ] Verify backup completion

### Weekly Security Tasks  
- [ ] Review failed login attempts and unusual activity
- [ ] Analyze security metrics and trends
- [ ] Check for dependency updates
- [ ] Review admin access logs

### Monthly Security Tasks
- [ ] Security patch review and application
- [ ] Access control review
- [ ] Incident response drill
- [ ] Security awareness training update

### Quarterly Security Tasks
- [ ] Comprehensive security assessment
- [ ] Penetration testing
- [ ] Policy and procedure review
- [ ] Compliance audit
- [ ] Incident response plan review
- [ ] Business continuity testing

---

## 🆘 Emergency Security Procedures

### Immediate Security Incident Response
```bash
# 1. Enable maintenance mode immediately
export EMERGENCY_MAINTENANCE=true

# 2. Block suspicious IP addresses
# Update middleware.ts blocklist

# 3. Rotate compromised credentials
vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY [new-key] production

# 4. Contact emergency response team
# See incident response playbook
```

### Security Incident Contacts
- **Security Team**: security@probwin.ai
- **Technical Team**: tech@probwin.ai  
- **Executive Team**: exec@probwin.ai
- **Legal**: legal@probwin.ai

---

## 📚 Additional Security Resources

### External Security Tools
- **SSL Testing**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **OWASP Guidelines**: https://owasp.org/
- **PCI DSS Compliance**: https://www.pcisecuritystandards.org/

### Security Training
- OWASP Top 10 Training
- Secure Coding Practices  
- Incident Response Training
- Privacy and Compliance Training

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Review Schedule**: Monthly  
**Next Review**: 2024-02-15

> **WARNING**: This checklist is critical for security compliance. Do not skip any items. If you're unsure about any item, consult with a security expert before proceeding to production.