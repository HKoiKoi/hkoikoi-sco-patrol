-- revision 비교가 `<>`이면 NULL이 들어왔을 때 결과가 NULL이 되어 충돌 검사를 통과한다.
-- `is distinct from`으로 바꿔 NULL도 충돌로 처리한다(본문은 그 한 줄만 다르다).
create or replace function public.save_patrol_draft(
  base_revision bigint,
  standing integer[],
  cafe_zone integer[],
  drowsy integer[],
  away integer[],
  memo text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_standing int[] := private.normalize_seats(standing);
  v_cafe_zone int[] := private.normalize_seats(cafe_zone);
  v_drowsy int[] := private.normalize_seats(drowsy);
  v_away int[] := private.normalize_seats(away);
  v_memo text := coalesce(memo, '');
  v_draft public.patrol_drafts;
begin
  if not (select private.is_staff()) then
    raise exception '순찰 기록 권한이 없습니다' using errcode = '42501';
  end if;

  if char_length(v_memo) > 2000 then
    raise exception '메모는 2,000자 이하여야 합니다' using errcode = '22023';
  end if;

  insert into public.patrol_drafts (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  select * into v_draft
  from public.patrol_drafts
  where user_id = (select auth.uid())
  for update;

  if v_draft.revision is distinct from base_revision then
    return jsonb_build_object(
      'status', 'conflict',
      'server_revision', v_draft.revision,
      'server_draft', private.draft_json(v_draft)
    );
  end if;

  update public.patrol_drafts
  set standing = v_standing,
      cafe_zone = v_cafe_zone,
      drowsy = v_drowsy,
      away = v_away,
      memo = v_memo,
      revision = revision + 1,
      updated_at = now()
  where user_id = v_draft.user_id
  returning * into v_draft;

  return jsonb_build_object(
    'status', 'ok',
    'revision', v_draft.revision,
    'updated_at', v_draft.updated_at
  );
end;
$function$;

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
  returning * into v_log;

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
