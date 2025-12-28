# 📝 Step-by-Step: Create Edge Function on Supabase

## Step 1: Access Supabase Dashboard

1. Go to: **https://supabase.com/dashboard/project/bcripmhepdufpvfkqlil**
2. Log in if needed
3. You should see your FAP project dashboard

## Step 2: Navigate to Edge Functions

1. Look at the **left sidebar**
2. Scroll down and click on **"Edge Functions"** (it has a ⚡ lightning icon)
3. You'll see the Edge Functions page

## Step 3: Create New Function

1. Click the **"Create a new function"** button (green button, top right)
2. A dialog will appear asking for function details

## Step 4: Configure Function

Fill in these details:

- **Function name**: `ai-chat` (exactly this, no spaces)
- **Template**: Select "HTTP Request" or "Blank"
- Click **"Create function"**

## Step 5: Add the Code

1. After creation, you'll see a code editor
2. **Delete all existing code** in the editor
3. Copy the ENTIRE code from: `d:\FAP App\FAP_NextGen\supabase\functions\ai-chat\index.ts`
4. Paste it into the Supabase editor
5. Click **"Deploy"** button (bottom right)

## Step 6: Set Environment Secrets

1. After deploying, click on the **"Settings"** tab (top of the page)
2. Scroll to **"Secrets"** section
3. Click **"Add new secret"**
4. Add these secrets one by one:

   **Secret 1:**
   - Name: `OPENROUTER_API_KEY`
   - Value: `sk-or-v1-YOUR_ACTUAL_OPENROUTER_KEY`
   
   **Secret 2:**
   - Name: `SUPABASE_URL`
   - Value: `https://bcripmhepdufpvfkqlil.supabase.co`
   
   **Secret 3:**
   - Name: `SUPABASE_ANON_KEY`
   - Value: (copy from your `.env` file - the long JWT token)
   
   **Secret 4:**
   - Name: `APP_URL`
   - Value: `http://localhost:5173` (for now, update after Vercel deploy)

5. Click **"Save"** for each secret

## Step 7: Test the Function

1. Go back to the **"Details"** tab
2. You should see your function URL (something like):
   `https://bcripmhepdufpvfkqlil.supabase.co/functions/v1/ai-chat`
3. The function is now deployed! ✅

---

## ✅ Done!

Your Edge Function is now live and ready to handle AI requests securely!

**Next Step**: Deploy your frontend to Vercel (see QUICK_DEPLOY.md)

---

## 🔍 Troubleshooting

**Can't find Edge Functions?**
- Make sure you're on the correct project
- Edge Functions might be under "Database" → "Functions" on some accounts

**Deploy button greyed out?**
- Make sure the code has no syntax errors
- Try clicking "Format" first

**Function not working?**
- Check the "Logs" tab to see error messages
- Verify all secrets are set correctly
