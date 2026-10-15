-- 좌석 번호 배열 검증: null 원소 없음, 모두 양수, 중복 없음 (빈 배열 허용)
-- patrol_logs / patrol_drafts의 check 제약에서도 쓰므로 quick_tags보다 먼저 만든다
create function private.is_valid_seats(seats int[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    seats is not null
    and not exists (
      select 1 from unnest(seats) as s where s is null or s <= 0
    )
    and cardinality(seats) = (select count(distinct s) from unnest(seats) as s);
$$;

-- check 제약은 쓰기를 수행하는 역할 권한으로 평가되므로 authenticated에 실행 권한이 필요하다
revoke execute on function private.is_valid_seats(int[]) from public, anon;
grant execute on function private.is_valid_seats(int[]) to authenticated;

-- 퀵 태그
create table public.quick_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null check (btrim(label) <> '' and label !~ '[\r\n]'),
  sort_order int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 공백 정리·대소문자 무시 유일
create unique index quick_tags_label_unique
  on public.quick_tags (lower(regexp_replace(btrim(label), '\s+', ' ', 'g')));

alter table public.quick_tags enable row level security;

revoke all on table public.quick_tags from public, anon, authenticated;
grant select on table public.quick_tags to anon, authenticated;
grant insert, update, delete on table public.quick_tags to authenticated;

create policy "비로그인은 활성 퀵 태그만 조회"
  on public.quick_tags for select to anon
  using (is_active);

create policy "로그인 사용자는 활성 태그, 관리자는 전체 조회"
  on public.quick_tags for select to authenticated
  using (is_active or (select private.is_admin()));

create policy "관리자만 퀵 태그 추가"
  on public.quick_tags for insert to authenticated
  with check ((select private.is_admin()));

create policy "관리자만 퀵 태그 수정"
  on public.quick_tags for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "관리자만 퀵 태그 삭제"
  on public.quick_tags for delete to authenticated
  using ((select private.is_admin()));

-- 초기 데이터
insert into public.quick_tags (label, sort_order) values
  ('퇴실자 탭 디스플레이 종료', 1),
  ('화장실 정리', 2),
  ('제빙기 물 보충', 3),
  ('정수기 및 커피머신 청소', 4),
  ('전 열람실 에어컨 종료', 5);
