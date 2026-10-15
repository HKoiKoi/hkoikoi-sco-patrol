-- 영업일 계산: 매일 04:00(KST) 경계. 완료 시각 기준 영업일을 돌려준다
create function private.business_date_of(ts timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select ((ts at time zone 'Asia/Seoul') - interval '4 hours')::date;
$$;

-- 좌석 번호 정규화: 양의 정수만 남기고 중복 제거 후 오름차순 정렬 (null·빈 입력은 빈 배열)
create function private.normalize_seats(seats int[])
returns int[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct s order by s), '{}'::int[])
  from unnest(seats) as s
  where s > 0;
$$;

-- 서버 초안 응답 형태(평평한 snake_case). conflict 응답의 server_draft에서 쓴다
create function private.draft_json(d public.patrol_drafts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'revision', d.revision,
    'updated_at', d.updated_at,
    'standing', to_jsonb(d.standing),
    'cafe_zone', to_jsonb(d.cafe_zone),
    'drowsy', to_jsonb(d.drowsy),
    'away', to_jsonb(d.away),
    'memo', d.memo
  );
$$;

revoke execute on function private.business_date_of(timestamptz) from public, anon;
revoke execute on function private.normalize_seats(int[]) from public, anon;
revoke execute on function private.draft_json(public.patrol_drafts) from public, anon;
grant execute on function private.business_date_of(timestamptz) to authenticated;
grant execute on function private.normalize_seats(int[]) to authenticated;
grant execute on function private.draft_json(public.patrol_drafts) to authenticated;

-- 초안 저장: revision이 일치할 때만 저장하고 revision + 1 (낙관적 충돌 감지)
-- 파라미터명이 컬럼명과 같아 본문 SQL에서는 선언부에서 복사한 v_* 변수만 쓴다
create function public.save_patrol_draft(
  base_revision bigint,
  standing int[],
  cafe_zone int[],
  drowsy int[],
  away int[],
  memo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  -- 행이 없으면 빈 초안(revision 0)을 만든 뒤 잠근다. base_revision이 0이 아니면 아래에서 충돌 처리된다
  insert into public.patrol_drafts (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  select * into v_draft
  from public.patrol_drafts
  where user_id = (select auth.uid())
  for update;

  if v_draft.revision <> base_revision then
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

  return jsonb_build_object('status', 'ok', 'revision', v_draft.revision);
end;
$$;

-- 순찰 완료: 서버에 저장된 초안으로 기록을 만들고 초안을 비운다 (요청 ID 멱등)
create function public.complete_patrol(
  client_request_id uuid,
  expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  -- ③ revision 불일치 시 서버 초안과 함께 충돌 응답
  if v_draft.revision <> expected_revision then
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
$$;

-- security definer 함수는 기본적으로 PUBLIC 실행 권한이 있으므로 서명 전체를 명시해 회수한다
revoke execute on function public.save_patrol_draft(bigint, int[], int[], int[], int[], text)
  from public, anon;
revoke execute on function public.complete_patrol(uuid, bigint)
  from public, anon;
grant execute on function public.save_patrol_draft(bigint, int[], int[], int[], int[], text)
  to authenticated;
grant execute on function public.complete_patrol(uuid, bigint)
  to authenticated;
