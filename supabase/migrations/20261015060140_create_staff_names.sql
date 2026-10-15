-- 순찰 기록자 이름 표시용 테이블: 비로그인도 조회할 수 있도록 role 없이 이름만 담는다
create table public.staff_names (
  id uuid not null references public.profiles (id),
  full_name text,

  primary key (id)
);

alter table public.staff_names enable row level security;

-- 쓰기는 sync_staff_name 트리거(security definer)로만 가능
revoke all on table public.staff_names from anon, authenticated;
grant select on table public.staff_names to anon, authenticated;

create policy "스태프 이름은 누구나 조회 가능"
  on public.staff_names for select
  to anon, authenticated
  using ( true );

-- profiles의 role·full_name 변경을 staff_names에 반영
-- manager/admin이면 upsert, 그 외 역할은 기존 행이 있을 때만 이름을 갱신하고 행은 삭제하지 않는다
create function public.sync_staff_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role in ('manager', 'admin') then
    insert into public.staff_names (id, full_name)
    values (new.id, new.full_name)
    on conflict (id) do update set full_name = excluded.full_name;
  else
    update public.staff_names
    set full_name = new.full_name
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_staff_name() from public, anon, authenticated;

create trigger profiles_sync_staff_name
  after insert or update of role, full_name on public.profiles
  for each row execute function public.sync_staff_name();

-- 기존 manager/admin backfill
insert into public.staff_names (id, full_name)
select id, full_name
from public.profiles
where role in ('manager', 'admin')
on conflict (id) do update set full_name = excluded.full_name;
