-- 사용자 프로필 테이블 (Supabase User Management Starter 기반)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  updated_at timestamptz,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  primary key (id),
  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;

-- Data API 노출 (RLS와 별개로 테이블 접근 권한 필요)
grant select on table public.profiles to anon;
grant select, insert, update on table public.profiles to authenticated;

create policy "프로필은 누구나 조회 가능"
  on public.profiles for select
  to anon, authenticated
  using ( true );

create policy "본인 프로필만 생성 가능"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

create policy "본인 프로필만 수정 가능"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- 회원가입 시 프로필 행 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 기존 가입자 backfill
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
