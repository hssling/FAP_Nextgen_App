-- The Auth trigger previously derived every username from the email prefix.
-- Different addresses such as student@example.com and student@college.edu then
-- collided on profiles.username and Auth returned "Database error saving new user".

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname = 'auth'
      and c.relname = 'users'
      and pn.nspname = 'public'
      and p.proname = 'handle_new_user'
  ) then
    raise exception 'Expected auth.users trigger using public.handle_new_user() was not found';
  end if;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  profile_username text;
  profile_role text;
begin
  requested_username := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
  profile_username := coalesce(
    requested_username,
    lower(nullif(trim(split_part(new.email, '@', 1)), '')),
    'user'
  );

  -- A username collision must not abort creation of the Auth account. The
  -- registration upsert can subsequently apply the requested profile fields.
  if exists (
    select 1
    from public.profiles
    where username = profile_username
  ) then
    profile_username := profile_username || '_' || replace(new.id::text, '-', '');
  end if;

  profile_role := lower(coalesce(nullif(trim(new.raw_user_meta_data ->> 'role'), ''), 'student'));
  if profile_role not in ('student', 'teacher', 'admin') then
    profile_role := 'student';
  end if;

  insert into public.profiles (
    id,
    username,
    full_name,
    email,
    role,
    is_active
  )
  values (
    new.id,
    profile_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), profile_username),
    new.email,
    profile_role,
    true
  );

  return new;
end;
$$;
