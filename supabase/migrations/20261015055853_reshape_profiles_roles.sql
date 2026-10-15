-- profiles 재정비: 스타터 컬럼 제거, 역할(role) 추가, 접근 권한을 본인 행 중심으로 축소

-- 1) 사용하지 않는 스타터 컬럼 제거 (username 제약·unique 인덱스는 컬럼과 함께 사라진다)
alter table public.profiles drop constraint username_length;
alter table public.profiles drop column username;
alter table public.profiles drop column website;
alter table public.profiles drop column avatar_url;

-- 2) 역할 컬럼: 신규 가입자는 항상 pending, 승격은 Supabase 대시보드에서 수동 처리
alter table public.profiles
  add column role text not null default 'pending'
  check (role in ('pending', 'manager', 'admin'));

-- 3) updated_at 기본값과 자동 갱신 트리거
alter table public.profiles alter column updated_at set default now();
update public.profiles set updated_at = now() where updated_at is null;

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

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4) 회원가입 시 프로필 생성: full_name -> name -> 이메일 앞부분, role은 메타데이터를 읽지 않고 항상 pending
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 5) 기존 행 full_name 공백 backfill
update public.profiles p
set full_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id
  and (p.full_name is null or btrim(p.full_name) = '');

-- 6) RLS 정책 재생성: 본인 행만 조회·수정 (insert는 트리거로만)
drop policy "프로필은 누구나 조회 가능" on public.profiles;
drop policy "본인 프로필만 생성 가능" on public.profiles;
drop policy "본인 프로필만 수정 가능" on public.profiles;

create policy "본인 프로필만 조회 가능"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "본인 프로필만 수정 가능"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- 7) 컬럼 GRANT: authenticated는 조회와 full_name 수정만 가능 (role 변경 불가)
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
