-- 20261021175438에서 추가한 `on conflict (client_request_id)`의 client_request_id가
-- 함수 파라미터 이름과 겹쳐 42702(ambiguous)로 모든 순찰 완료가 실패했다.
-- 컬럼 대신 unique 제약 이름으로 충돌 대상을 지정해 파라미터와 겹치지 않게 한다. 나머지 본문은 같다.
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
  on conflict on constraint patrol_logs_client_request_id_key do nothing
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
