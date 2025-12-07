# 🔑 Supabase Credentials Setup - IMPORTANT

## ✅ Your Supabase Project

**Project URL**: `https://bcripmhepdufpvfkqlil.supabase.co`
**Project ID**: `bcripmhepdufpvfkqlil`

---

## ⚠️ IMPORTANT: Get the Correct API Key

You provided a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, but we need the **anon/public key** instead.

### How to Get the Correct Key:

1. **Go to Supabase Dashboard**:
   ```
   https://app.supabase.com/project/bcripmhepdufpvfkqlil/settings/api
   ```

2. **Find "Project API keys" section**

3. **Copy the "anon" "public" key**:
   - It should be labeled as `anon` `public`
   - It starts with `eyJhbGc...`
   - It's a very long string (hundreds of characters)
   - **NOT** the `service_role` key (keep that secret!)

---

## 📝 Create .env File

### Step 1: Create the File

Create a file named `.env` in your project root:
```
d:/FAP App/FAP_NextGen/.env
```

### Step 2: Add This Content

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://bcripmhepdufpvfkqlil.supabase.co
VITE_SUPABASE_ANON_KEY=paste-your-anon-key-here
```

**Replace `paste-your-anon-key-here` with the actual anon key from Supabase!**

---

## 🔧 Variable Name Explanation

### ❌ Wrong (Next.js format):
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

### ✅ Correct (Vite format):
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Why?**
- Your app uses **Vite**, not Next.js
- Vite requires `VITE_` prefix for environment variables
- We need the `anon` key, not the publishable key

---

## 🚀 After Creating .env File

### 1. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

### 2. Check Console

Open browser console (F12) and look for:
- ✅ **Success**: No "Using IndexedDB fallback" message
- ✅ **Success**: Supabase connection established
- ❌ **Error**: Still shows fallback message → check .env file

### 3. Test Database Connection

1. Create a family in the app
2. Go to Supabase Dashboard → Table Editor → families
3. You should see the new record!

---

## 📋 Complete .env File Template

Create `d:/FAP App/FAP_NextGen/.env` with:

```env
# Supabase Configuration
# Get anon key from: https://app.supabase.com/project/bcripmhepdufpvfkqlil/settings/api

VITE_SUPABASE_URL=https://bcripmhepdufpvfkqlil.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE

# Note: The anon key is safe to use in frontend code
# Never commit this file to git (already in .gitignore)
```

---

## 🗄️ Database Setup

### Have you run the SQL schema yet?

If not, you need to:

1. **Go to SQL Editor**:
   ```
   https://app.supabase.com/project/bcripmhepdufpvfkqlil/sql
   ```

2. **Click "New query"**

3. **Copy SQL from**: `BACKEND_INTEGRATION_GUIDE.md` (lines 13-200)

4. **Paste and Run**

5. **Verify**: Go to Table Editor → Should see 6 tables:
   - profiles
   - families
   - members
   - visits
   - villages
   - reflections

---

## ✅ Verification Checklist

- [ ] Created `.env` file in project root
- [ ] Added `VITE_SUPABASE_URL` with your project URL
- [ ] Got **anon key** from Supabase dashboard (not publishable key)
- [ ] Added `VITE_SUPABASE_ANON_KEY` with anon key
- [ ] Ran SQL schema in Supabase
- [ ] Verified 6 tables exist in Table Editor
- [ ] Restarted dev server
- [ ] Checked browser console (no fallback message)
- [ ] Tested creating a family
- [ ] Verified data in Supabase dashboard

---

## 🎯 Quick Steps Summary

```bash
# 1. Get anon key from Supabase dashboard
# https://app.supabase.com/project/bcripmhepdufpvfkqlil/settings/api

# 2. Create .env file
# File: d:/FAP App/FAP_NextGen/.env
# Content:
VITE_SUPABASE_URL=https://bcripmhepdufpvfkqlil.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key

# 3. Run SQL schema (if not done)
# Copy from BACKEND_INTEGRATION_GUIDE.md
# Paste in Supabase SQL Editor

# 4. Restart server
npm run dev

# 5. Test!
```

---

## 🐛 Troubleshooting

### Issue: "Supabase credentials not found"
**Solution**: 
- Check `.env` file exists in project root
- Verify variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server

### Issue: "Invalid API key"
**Solution**:
- Make sure you copied the **anon** key, not service_role
- Check for extra spaces or line breaks in .env file

### Issue: "Table doesn't exist"
**Solution**:
- Run the SQL schema from BACKEND_INTEGRATION_GUIDE.md
- Check Table Editor to verify tables exist

---

## 🎉 Success!

Once set up correctly, you'll have:
- ✅ Cloud database (PostgreSQL)
- ✅ Data sync across devices
- ✅ Automatic backup
- ✅ Multi-user support
- ✅ Professional infrastructure

---

**Next**: Get your anon key and create the .env file!
