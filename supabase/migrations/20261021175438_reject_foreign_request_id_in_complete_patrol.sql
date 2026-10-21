-- client_request_id는 patrol_logs 전체에서 unique인데 멱등 조회는 본인(author_id) 기록만 찾는다.
-- 다른 사용자의 기록과 ID가 겹치면 조회는 비고 insert가 23505 제약 위반 원문 에러로 끝났다.
-- 다른 사용자의 기록을 duplicate로 돌려주면 이 사용자의 순찰이 조용히 사라지므로 그렇게 하지 않고,
-- insert를 `on conflict do nothing`으로 바꿔 정리된 에러(22023)로 거절한다.
-- 예외로 끝나면 트랜잭션이 롤백되어 초안은 그대로이며, 클라이언트는 요청 ID를 버리고 새 ID로 다시 시도한다.
-- 본문은 ④ 단계만 다르다.
create or replace function public.complete_patrol(
  client_request_id uuid,
  expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_request_id uuid := client_request_id;
  v_uid uuid := (select auth.uid());
  v_draft public.patrol_drafts;
  v_log public.patrol_logs;
begin
  if not (select private.is_staff()) then
    raise exception '순찰 기록 권한이 없습니다' using errcode = '42501';
  end if;

  -- ① 초안 행 보장 후 잠금
  insert into public.patrol_drafts (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_draft
  from public.patrol_drafts
  where user_id = v_uid
  for update;

  -- ② 같은 요청 ID로 이미 완료된 기록(작성자 본인)이 있으면 초안을 건드리지 않고 반환
  select * into v_log
  from public.patrol_logs l
  where l.client_request_id = v_request_id
    and l.author_id = v_uid;

  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'log_id', v_log.id,
      'patrolled_at', v_log.patrolled_at,
      'revision', v_draft.revision
    );
  end if;

  -- ③ revision 불일치(NULL 포함) 시 서버 초안과 함께 충돌 응답
  if v_draft.revision is distinct from expected_revision then
    return jsonb_build_object(
      'status', 'conflict',
      'server_revision', v_draft.revision,
      'server_draft', private.draft_json(v_draft)
    );
  end if;

  -- ④ 서버 초안 내용으로 기록 생성 (빈 초안이라도 revision이 맞으면 허용)
  --    ID가 다른 사용자의 기록과 겹치면 행이 만들어지지 않으므로 정리된 에러로 거절한다.
  insert into public.patrol_logs (
    client_request_id, business_date, patrolled_at, author_id,
    standing, cafe_zone, drowsy, away, memo
  )
  values (
    v_request_id,
    private.business_date_of(now()),
    now(),
    v_uid,
    v_draft.standing,
    v_draft.cafe_zone,
    v_draft.drowsy,
    v_draft.away,
    v_draft.memo
  )
  on conflict (client_request_id) do nothing
  returning * into v_log;

  if not found then
    raise exception '사용할 수 없는 요청 ID입니다' using errcode = '22023';
  end if;

  -- ⑤ 초안을 빈 값 + revision + 1로 초기화
  update public.patrol_drafts
  set standing = '{}',
      cafe_zone = '{}',
      drowsy = '{}',
      away = '{}',
      memo = '',
      revision = revision + 1,
      updated_at = now()
  where user_id = v_uid
  returning * into v_draft;

  return jsonb_build_object(
    'status', 'ok',
    'log_id', v_log.id,
    'patrolled_at', v_log.patrolled_at,
    'revision', v_draft.revision
  );
end;
$function$;
