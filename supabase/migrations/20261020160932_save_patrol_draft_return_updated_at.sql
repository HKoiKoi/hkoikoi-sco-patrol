-- save_patrol_draft 성공 응답에 서버 시각(updated_at)을 추가한다.
-- 클라이언트가 "저장됨 HH:mm"을 서버 시각으로 표시하기 위해 별도 재조회 없이 쓴다.
-- 본문·역할 검사·security definer·search_path는 그대로이고 ok 응답만 바뀐다.
-- create or replace는 기존 EXECUTE 권한(GRANT)을 유지한다.
create or replace function public.save_patrol_draft(
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

  return jsonb_build_object(
    'status', 'ok',
    'revision', v_draft.revision,
    'updated_at', v_draft.updated_at
  );
end;
$$;
