-- profiles.full_name 길이·개행 제약
-- authenticated(pending 포함)가 update(full_name) GRANT로 이름을 바꿀 수 있고, sync_staff_name 트리거가
-- 이 값을 비로그인에게 공개되는 staff_names로 복사한다. 제약이 없으면 일지 작성자 이름이 오염될 수 있다
-- 가입 경로(handle_new_user)도 메타데이터 full_name을 그대로 쓰므로 GRANT 회수만으로는 막을 수 없다
-- staff_names는 sync_staff_name 트리거로만 쓰이므로 profiles 제약만으로 충분하다

-- 1) handle_new_user가 제약 위반으로 가입에 실패하지 않도록 이름을 정리한다
--    후보(full_name -> name -> 이메일 앞부분)마다 개행을 공백으로 바꾸고 앞뒤 공백 제거, 50자로 자른 뒤 다시 공백 제거
--    정리 후 빈 값인 후보는 건너뛴다. role은 메타데이터를 읽지 않고 항상 pending이다
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select s.cleaned
  into v_name
  from (
    select
      nullif(btrim(left(btrim(regexp_replace(c.raw, '[\r\n]+', ' ', 'g')), 50)), '') as cleaned,
      c.ord
    from unnest(array[
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ]) with ordinality as c(raw, ord)
  ) s
  where s.cleaned is not null
  order by s.ord
  limit 1;

  insert into public.profiles (id, full_name)
  values (new.id, v_name);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2) 제약: null 허용, 그 외에는 앞뒤 공백 제거 후 길이 1~50이고 개행(LF, CR) 금지
--    적용 시점에 모든 행이 이미 조건을 만족해(profiles 2행 확인) NOT VALID 단계 없이 바로 검증한다
alter table public.profiles
  add constraint profiles_full_name_check
  check (
    full_name is null
    or (
      char_length(btrim(full_name)) between 1 and 50
      and position(chr(10) in full_name) = 0
      and position(chr(13) in full_name) = 0
    )
  );
