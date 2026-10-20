-- 작성 중 초안: 사용자당 1건, 쓰기는 save_patrol_draft / complete_patrol RPC 전용
create table public.patrol_drafts (
  user_id uuid primary key references public.profiles (id),
  standing int[] not null default '{}' check (private.is_valid_seats(standing)),
  cafe_zone int[] not null default '{}' check (private.is_valid_seats(cafe_zone)),
  drowsy int[] not null default '{}' check (private.is_valid_seats(drowsy)),
  away int[] not null default '{}' check (private.is_valid_seats(away)),
  memo text not null default '' check (char_length(memo) <= 2000),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.patrol_drafts enable row level security;

revoke all on table public.patrol_drafts from public, anon, authenticated;
grant select on table public.patrol_drafts to authenticated;

create policy "본인 초안만 조회"
  on public.patrol_drafts for select
  to authenticated
  using ( user_id = (select auth.uid()) );
