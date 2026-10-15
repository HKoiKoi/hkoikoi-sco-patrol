-- 퀵 태그 순서 맞바꿈: 두 행을 잠그고 sort_order를 한 트랜잭션에서 교환 (관리자 전용)
create function public.swap_quick_tag_order(tag_a uuid, tag_b uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_a int;
  v_order_b int;
begin
  if not (select private.is_admin()) then
    raise exception '관리자 권한이 필요합니다' using errcode = '42501';
  end if;

  if tag_a = tag_b then
    raise exception '서로 다른 태그를 지정해야 합니다' using errcode = '22023';
  end if;

  -- 교착 방지를 위해 id 순서로 잠근다
  perform 1
  from public.quick_tags
  where id in (tag_a, tag_b)
  order by id
  for update;

  select sort_order into v_order_a from public.quick_tags where id = tag_a;
  select sort_order into v_order_b from public.quick_tags where id = tag_b;

  if v_order_a is null or v_order_b is null then
    raise exception '존재하지 않는 퀵 태그입니다' using errcode = 'P0002';
  end if;

  update public.quick_tags
  set sort_order = case id when tag_a then v_order_b else v_order_a end
  where id in (tag_a, tag_b);
end;
$$;

revoke execute on function public.swap_quick_tag_order(uuid, uuid) from public, anon;
grant execute on function public.swap_quick_tag_order(uuid, uuid) to authenticated;
