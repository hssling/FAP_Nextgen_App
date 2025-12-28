# AI Medical Coach - Deployment Guide

## Current Status
The AI Medical Coach is configured to work in **development mode** using your personal Gemini API key.

## ⚠️ Important: Production Deployment

**DO NOT deploy the `.env` file to production!** Your API key will be exposed.

## Recommended Production Setup

### Option 1: Supabase Edge Function (Recommended)

Create a secure backend endpoint:

```bash
# In your Supabase project
supabase functions new gemini-chat
```

Then deploy the function that proxies requests to Gemini API securely.

### Option 2: Disable in Production

Add this to your `AICoach.jsx`:

```javascript
if (import.meta.env.PROD && !import.meta.env.VITE_GEMINI_API_KEY) {
    return <ComingSoonMessage />;
}
```

## For Now: Development Only

The AI Coach works perfectly in development mode. To deploy:

1. **Remove** `VITE_GEMINI_API_KEY` from `.env` before deploying
2. The app will show a "Coming Soon" message in production
3. Implement Edge Function later for production use

## Next Steps

Would you like me to:
- [ ] Create a Supabase Edge Function for secure production use
- [ ] Add a "Coming Soon" placeholder for production
- [ ] Keep it development-only for now
