# Quick Deployment Instructions

Since automated CLI deployment has some setup requirements, here's the **manual deployment** approach (takes 5 minutes):

## Option 1: Deploy via Supabase Dashboard (Easiest)

### Step 1: Create the Edge Function

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/bcripmhepdufpvfkqlil
2. Navigate to **Edge Functions** in the left sidebar
3. Click **"Create a new function"**
4. Name it: `ai-chat`
5. Copy the code from `supabase/functions/ai-chat/index.ts` and paste it
6. Click **Deploy**

### Step 2: Set Environment Variables

1. In the Edge Functions page, click on `ai-chat`
2. Go to **Settings** tab
3. Add these secrets:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key (sk-or-v1-...)
   - `APP_URL`: Your production URL (will add after frontend deploy)
   - `SUPABASE_URL`: https://bcripmhepdufpvfkqlil.supabase.co
   - `SUPABASE_ANON_KEY`: (copy from your .env file)

### Step 3: Deploy Frontend to Vercel

1. Push your code to GitHub (already done ✅)
2. Go to https://vercel.com
3. Click **"New Project"**
4. Import your GitHub repository
5. **Important**: Don't add `VITE_OPENROUTER_API_KEY` to Vercel environment variables
6. Click **Deploy**

### Step 4: Update APP_URL

1. After Vercel deployment, copy your production URL
2. Go back to Supabase Edge Function settings
3. Update `APP_URL` with your Vercel URL

## Option 2: Use Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## ✅ That's It!

Your app will be live with:
- Secure AI Coach (server-side API)
- All features working
- Free hosting (Vercel + Supabase)

**Estimated time**: 5-10 minutes

---

## 🧪 Testing Production

After deployment:
1. Visit your Vercel URL
2. Log in
3. Go to AI Coach
4. Ask a question
5. Should work instantly! 🎉
