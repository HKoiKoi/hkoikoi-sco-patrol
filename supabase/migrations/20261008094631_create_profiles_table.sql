-- 사용자 프로필 테이블 (Supabase User Management Starter 기반, 프로덕션 보안 강화)
create table public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_format check (username ~ '^[a-z0-9_.]{3,30}$'),
  constraint full_name_length check (char_length(full_name) <= 100),
  constraint website_format check (
    website ~* '^https?://' and char_length(website) <= 255
  )
);

comment on table public.profiles is '사용자 공개 프로필 (auth.users와 1:1)';

-- 권한 최소화: anon 접근 불가, 삭제는 auth.users cascade로만 처리
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

-- RLS
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users."
  on public.profiles for select to authenticated
  using (true);

create policy "Users can insert their own profile."
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile."
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- updated_at 자동 갱신
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 회원가입 시 프로필 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- 트리거 전용 함수: RPC로 직접 호출되지 않도록 차단
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 기존 가입자 백필
insert into public.profiles (id, full_name, avatar_url)
select id, raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;
