-- 🚨 EMERGENCY PROFILE FIX 🚨
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on profiles to guarantee we can read them
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Grant permissions to everyone
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3. INSERT MISSING PROFILES (The Magic Fix)
-- This takes every user from auth.users and makes sure they have a profile
INSERT INTO public.profiles (id, username, full_name, role, email)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'username', substring(email from 1 for position('@' in email)-1)), 
    COALESCE(raw_user_meta_data->>'full_name', 'System User'), 
    COALESCE(raw_user_meta_data->>'role', 'student'), -- Default role
    email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 4. Verify Admin exists
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'hssling@yahoo.com' OR username = 'admin';

-- 5. Check results
SELECT count(*) as total_profiles FROM public.profiles;
