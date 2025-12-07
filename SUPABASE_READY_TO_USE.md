# ✅ SUPABASE CREDENTIALS - READY TO USE

## Your Supabase Configuration

**Project URL**: `https://bcripmhepdufpvfkqlil.supabase.co`
**Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcmlwbWhlcGR1ZnB2ZmtxbGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDU5OTIsImV4cCI6MjA4MDYyMTk5Mn0.oIH79jYtFzhFO3Pb82Ot_sKTMa_JeG3SC9GYJnTvnI8`

---

## 📝 STEP 1: Create .env File

**Create this file**: `d:/FAP App/FAP_NextGen/.env`

**Copy this exact content**:

```env
VITE_SUPABASE_URL=https://bcripmhepdufpvfkqlil.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcmlwbWhlcGR1ZnB2ZmtxbGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDU5OTIsImV4cCI6MjA4MDYyMTk5Mn0.oIH79jYtFzhFO3Pb82Ot_sKTMa_JeG3SC9GYJnTvnI8
```

### How to Create:

**Option 1: Using Text Editor**
1. Open Notepad or VS Code
2. Paste the content above
3. Save as: `d:/FAP App/FAP_NextGen/.env`
4. Make sure it's `.env` (not `.env.txt`)

**Option 2: Using PowerShell**
```powershell
cd "d:/FAP App/FAP_NextGen"
@"
VITE_SUPABASE_URL=https://bcripmhepdufpvfkqlil.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcmlwbWhlcGR1ZnB2ZmtxbGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDU5OTIsImV4cCI6MjA4MDYyMTk5Mn0.oIH79jYtFzhFO3Pb82Ot_sKTMa_JeG3SC9GYJnTvnI8
"@ | Out-File -FilePath .env -Encoding utf8
```

---

## 🗄️ STEP 2: Run SQL Schema

1. **Go to Supabase SQL Editor**:
   ```
   https://app.supabase.com/project/bcripmhepdufpvfkqlil/sql
   ```

2. **Click "New query"**

3. **Copy the SQL below** (or from `BACKEND_INTEGRATION_GUIDE.md`):

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

4. **Click "Run"**

5. **Verify**: Go to Table Editor → You should see 6 tables

---

## 🚀 STEP 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

---

## ✅ STEP 4: Test!

1. **Open**: http://localhost:5176/ (or whatever port shows)
2. **Check Console** (F12): Should NOT see "Using IndexedDB fallback"
3. **Create a family** in the app
4. **Go to Supabase**: https://app.supabase.com/project/bcripmhepdufpvfkqlil/editor
5. **Check families table**: Your data should be there! 🎉

---

## 📋 Quick Checklist

- [ ] Created `.env` file with credentials
- [ ] Ran SQL schema in Supabase
- [ ] Verified 6 tables exist
- [ ] Restarted dev server
- [ ] No "fallback" message in console
- [ ] Created test family
- [ ] Data appears in Supabase dashboard

---

## 🎉 Success!

Once complete, you'll have:
- ✅ Cloud database active
- ✅ Data syncing to Supabase
- ✅ Multi-device access
- ✅ Automatic backup
- ✅ Production-ready backend

---

**Ready to set up? Follow the steps above!**
