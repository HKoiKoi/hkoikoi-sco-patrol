-- 방치 초안 정리: 2시간 이상 지난 비어 있지 않은 초안만 빈 값 + revision + 1로 초기화한다 (행 삭제 없음)
create extension if not exists pg_cron with schema pg_catalog;

create function private.reset_stale_drafts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.patrol_drafts
  set standing = '{}',
      cafe_zone = '{}',
      drowsy = '{}',
      away = '{}',
      memo = '',
      revision = revision + 1,
      updated_at = now()
  where updated_at < now() - interval '2 hours'
    and (
      cardinality(standing) > 0
      or cardinality(cafe_zone) > 0
      or cardinality(drowsy) > 0
      or cardinality(away) > 0
      or memo <> ''
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- cron(postgres 역할)만 호출한다. 앱 역할은 RPC로도 실행할 수 없어야 한다
revoke execute on function private.reset_stale_drafts() from public, anon, authenticated;

select cron.schedule(
  'reset-stale-patrol-drafts',
  '*/30 * * * *',
  'select private.reset_stale_drafts()'
);
