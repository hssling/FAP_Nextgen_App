# Backend Database Integration Guide - Supabase

## 🎯 Overview

We'll integrate **Supabase** (PostgreSQL) for:
- ✅ Cloud data storage
- ✅ Multi-device sync
- ✅ User authentication
- ✅ Real-time updates
- ✅ Data backup
- ✅ Teacher-student collaboration

---

## 📋 Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase

1. Go to https://supabase.com/
2. Click "Start your project"
3. Sign in with GitHub
4. Create new organization (or use existing)

### 1.2 Create New Project

1. Click "New Project"
2. Fill in details:
   - **Name**: FAP-NextGen
   - **Database Password**: (Create a strong password - SAVE THIS!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier (500MB database, 50,000 monthly active users)
3. Click "Create new project"
4. Wait 2-3 minutes for setup

### 1.3 Get API Credentials

1. Go to Project Settings → API
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)
   - **service_role key**: `eyJhbGc...` (keep this secret!)

---

## 📊 Step 2: Create Database Schema

### 2.1 Open SQL Editor

1. In Supabase dashboard, click "SQL Editor"
2. Click "New query"
3. Paste the following SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  institution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Families table
CREATE TABLE public.families (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  head_name TEXT NOT NULL,
  village TEXT,
  address TEXT,
  phone TEXT,
  total_members INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members table
CREATE TABLE public.members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  relation TEXT,
  abha_number TEXT,
  phone TEXT,
  health_status JSONB,
  problems JSONB DEFAULT '[]'::jsonb,
  interventions JSONB DEFAULT '[]'::jsonb,
  assessments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visits table
CREATE TABLE public.visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type TEXT,
  form_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Villages table
CREATE TABLE public.villages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  village_name TEXT NOT NULL,
  profile_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reflections table
CREATE TABLE public.reflections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  phase TEXT,
  content TEXT NOT NULL,
  ai_feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for families
CREATE POLICY "Users can view own families" ON public.families
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own families" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own families" ON public.families
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own families" ON public.families
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for members
CREATE POLICY "Users can view own members" ON public.members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own members" ON public.members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own members" ON public.members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own members" ON public.members
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for visits
CREATE POLICY "Users can view own visits" ON public.visits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visits" ON public.visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visits" ON public.visits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own visits" ON public.visits
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for villages
CREATE POLICY "Users can view own villages" ON public.villages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own villages" ON public.villages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own villages" ON public.villages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own villages" ON public.villages
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reflections
CREATE POLICY "Users can view own reflections" ON public.reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections" ON public.reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections" ON public.reflections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections" ON public.reflections
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_families_user_id ON public.families(user_id);
CREATE INDEX idx_members_family_id ON public.members(family_id);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_visits_family_id ON public.visits(family_id);
CREATE INDEX idx_visits_user_id ON public.visits(user_id);
CREATE INDEX idx_villages_user_id ON public.villages(user_id);
CREATE INDEX idx_reflections_user_id ON public.reflections(user_id);
CREATE INDEX idx_reflections_family_id ON public.reflections(family_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_villages_updated_at BEFORE UPDATE ON public.villages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL
5. Verify tables are created in "Table Editor"

---

## 📦 Step 3: Install Supabase Client

Run in your project directory:

```bash
cd "d:/FAP App/FAP_NextGen"
npm install @supabase/supabase-js
```

---

## 🔧 Step 4: Configure Environment Variables

### 4.1 Create .env file

Create `d:/FAP App/FAP_NextGen/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Supabase dashboard.

### 4.2 Update .gitignore

Ensure `.env` is in `.gitignore` (already done).

### 4.3 Configure Vercel Environment Variables

After deploying to Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
3. Redeploy

---

## 📝 Step 5: Implementation Files

I'll create the necessary files in the next steps:

1. **supabaseClient.js** - Supabase connection
2. **supabaseDb.js** - Database operations (replaces db.js)
3. **SupabaseAuthContext.jsx** - Authentication with Supabase
4. Update existing components to use Supabase

---

## 🎯 Benefits After Integration

✅ **Data Sync**: Access from any device
✅ **Backup**: Cloud storage, never lose data
✅ **Collaboration**: Teachers can view student data
✅ **Authentication**: Secure user accounts
✅ **Real-time**: Live updates across devices
✅ **Scalable**: Handles many users
✅ **Free**: Up to 500MB database

---

## 📊 Migration Strategy

### Option 1: Fresh Start (Recommended)
- Deploy new version with Supabase
- Users create new accounts
- Start fresh data collection

### Option 2: Data Migration
- Export existing IndexedDB data
- Import to Supabase
- More complex, requires custom script

---

**Next Steps**: 
1. Create Supabase project
2. Run SQL schema
3. Get API credentials
4. I'll create the integration files

Ready to proceed?
