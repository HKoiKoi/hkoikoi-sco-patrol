-- 확정 순찰 기록: insert는 complete_patrol RPC 전용이므로 테이블 insert 권한을 주지 않는다
create table public.patrol_logs (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  business_date date not null,
  patrolled_at timestamptz not null,
  author_id uuid not null,
  standing int[] not null default '{}' check (private.is_valid_seats(standing)),
  cafe_zone int[] not null default '{}' check (private.is_valid_seats(cafe_zone)),
  drowsy int[] not null default '{}' check (private.is_valid_seats(drowsy)),
  away int[] not null default '{}' check (private.is_valid_seats(away)),
  memo text check (char_length(memo) <= 2000),

  constraint patrol_logs_author_id_profiles_fkey
    foreign key (author_id) references public.profiles (id),
  -- 강등되어도 작성자 이름이 남도록 staff_names도 참조 (일지 조회에서 embed)
  constraint patrol_logs_author_id_staff_names_fkey
    foreign key (author_id) references public.staff_names (id)
);

create index patrol_logs_business_date_patrolled_at_idx
  on public.patrol_logs (business_date, patrolled_at);
create index patrol_logs_author_id_idx
  on public.patrol_logs (author_id);

alter table public.patrol_logs enable row level security;

revoke all on table public.patrol_logs from public, anon, authenticated;
grant select on table public.patrol_logs to anon, authenticated;
grant update (standing, cafe_zone, drowsy, away, memo)
  on table public.patrol_logs to authenticated;
grant delete on table public.patrol_logs to authenticated;

create policy "순찰 기록은 누구나 조회 가능"
  on public.patrol_logs for select
  to anon, authenticated
  using ( true );

create policy "본인 스태프 또는 관리자만 기록 수정"
  on public.patrol_logs for update
  to authenticated
  using (
    (author_id = (select auth.uid()) and (select private.is_staff()))
    or (select private.is_admin())
  )
  with check (
    (author_id = (select auth.uid()) and (select private.is_staff()))
    or (select private.is_admin())
  );

create policy "본인 스태프 또는 관리자만 기록 삭제"
  on public.patrol_logs for delete
  to authenticated
  using (
    (author_id = (select auth.uid()) and (select private.is_staff()))
    or (select private.is_admin())
  );
