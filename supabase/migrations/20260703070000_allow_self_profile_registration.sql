-- A newly authenticated user must be able to create exactly their own profile.
-- The existing policies only allow administrators to insert profiles, causing
-- registration to leave an Auth user without a corresponding profile row.

drop policy if exists "Users can insert own profile during registration"
on public.profiles;

create policy "Users can insert own profile during registration"
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and role in ('student', 'teacher')
  and is_active is true
);
