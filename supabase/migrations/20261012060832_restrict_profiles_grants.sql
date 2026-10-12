-- 기본 권한(default privileges)으로 자동 부여된 불필요한 권한 회수 후 최소 권한만 재부여
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon;
grant select, insert, update on table public.profiles to authenticated;
