# 🚀 Vercel Environment Variables Setup

## Import these variables into your Vercel Dashboard:

Go to: [Vercel Environment Variables](https://vercel.com/berniegoldmannone-gmailcoms-projects/probwin-waitlist/settings/environment-variables)

### **Production Environment Variables**

```env
NEXT_PUBLIC_BASE_URL=https://probwin-waitlist.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://berahhdcvtlzqrtbrrjj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your Supabase Anon Key]
SUPABASE_SERVICE_ROLE_KEY=[Your Supabase Service Role Key]
JWT_SECRET=[Your JWT Secret]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe Publishable Key]
STRIPE_SECRET_KEY=[Your Stripe Secret Key]
STRIPE_PRICE_ID_99=price_1S1yJCJKUSyMvOq80SOnMZ7w
STRIPE_PRICE_ID_199=price_1S1yKUJKUSyMvOq8vJFfUK0H
STRIPE_WEBHOOK_SECRET=whsec_placeholder
RESEND_API_KEY=re_placeholder_key
ADMIN_EMAIL=admin@probwin.ai
RECAPTCHA_SECRET_KEY=6Le6wrgrAAAAAP8rIYMhv1rMe6pgIsFZa-SsPhBN
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le6wrgrAAAAANeN7rDnrPc6uPB4xY5-h6C3xD4D
SECURITY_SALT=probwin_security_salt_2024
```

### **Required Actions:**

1. **Copy your actual secrets** from `.env.local` file
2. **Import into Vercel** using the dashboard 
3. **Set environment** to "Production"
4. **Save and Deploy**

### **Key Changes Made:**

✅ **Fixed hCaptcha → reCAPTCHA migration**  
✅ **Removed all hCaptcha dependencies**  
✅ **Updated CSP headers for Google domains**  
✅ **Build now passes successfully**  

### **Next Steps After Import:**

1. **Vercel auto-deploys** (2-3 minutes)
2. **Setup database** in Supabase (run migration SQL)
3. **Configure Stripe webhook** endpoint
4. **Test live application** 🎉

Your application is ready for production deployment!