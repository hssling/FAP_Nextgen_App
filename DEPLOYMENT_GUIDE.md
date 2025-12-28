# 🚀 Production Deployment Guide - AI Medical Coach

## ✅ What's Been Done

The AI Medical Coach is now **production-ready** with secure server-side API calls!

### Architecture:
- **Development**: Direct OpenRouter API calls (your local API key)
- **Production**: Supabase Edge Function (server-side, secure)

---

## 📋 Deployment Steps

### 1. Deploy the Supabase Edge Function

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bcripmhepdufpvfkqlil

# Deploy the Edge Function
supabase functions deploy ai-chat

# Set the secret API key (server-side only, never exposed)
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-YOUR_ACTUAL_KEY_HERE
supabase secrets set APP_URL=https://your-app-domain.vercel.app
```

### 2. Deploy Your Frontend (Vercel/Netlify)

**Important**: Do NOT add `VITE_OPENROUTER_API_KEY` to production environment variables!

The production build will automatically use the secure Edge Function instead.

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

---

## 🔒 Security Benefits

✅ **API Key Protected**: Your OpenRouter key stays on the server  
✅ **User Authentication**: Only logged-in users can access AI Coach  
✅ **No Quota Theft**: Impossible for users to steal your API key  
✅ **Rate Limiting**: Can add limits in the Edge Function if needed  

---

## 🧪 Testing

### Development (Local):
- Uses your local `.env` file with `VITE_OPENROUTER_API_KEY`
- Direct API calls for faster development

### Production (Live):
- Uses Supabase Edge Function
- Secure server-side API calls
- Requires user authentication

---

## 📊 Monitoring

Check Edge Function logs:
```bash
supabase functions logs ai-chat
```

---

## 💰 Cost

- **OpenRouter Free Tier**: Generous limits for educational use
- **Supabase Edge Functions**: 500K invocations/month free
- **Total**: $0/month for typical student usage

---

## ⚠️ Before Going Live

1. ✅ Test AI Coach in development
2. ✅ Deploy Edge Function to Supabase
3. ✅ Set secrets (OPENROUTER_API_KEY, APP_URL)
4. ✅ Deploy frontend to Vercel/Netlify
5. ✅ Test in production
6. ✅ Monitor usage

---

**Ready to deploy!** 🎉
