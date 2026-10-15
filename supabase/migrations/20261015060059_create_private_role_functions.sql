-- 역할 판별용 private 스키마와 함수 (Data API 노출 스키마에 넣지 않는다)
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- 현재 사용자가 manager 또는 admin인지 판별 (RLS 우회를 위해 security definer)
create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('manager', 'admin')
  );
$$;

-- 현재 사용자가 admin인지 판별
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function private.is_staff() from public, anon;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;
