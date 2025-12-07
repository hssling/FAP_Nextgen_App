-- 🚨 FINAL SCHEMA UPGRADE 🚨
-- Run this in Supabase SQL Editor

-- 1. Add email column to profiles (Safe if exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 3. Ensure RLS allows reading email
-- (We already disabled RLS, but just in case)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
