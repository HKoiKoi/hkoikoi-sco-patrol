-- 공개 통계 RPC 기간 상한: anon이 PostgREST로 get_seat_stats / get_watchlist_seats를 직접 호출하면
-- 기간 제한 없이 patrol_logs 전체를 unnest해 집계하므로 DB 부하가 된다. 상한은 366일(윤년 1년)로 둔다
-- 앱의 정상 호출은 WATCH_WINDOW_DAYS(30일)뿐이라 결과는 바뀌지 않는다
-- 상한을 넘거나 인자가 null이면 예외 대신 빈 결과를 돌려준다(기존 null, 1 미만 처리와 같은 방식)

-- 좌석별 카테고리 통계: 기간(영업일 기준) 안의 스탠딩·카페존·졸음 횟수. 자리비움은 제외한다
-- 한 기록 안에서 같은 좌석은 카테고리당 한 번만 들어 있어(private.is_valid_seats) 횟수는 기록 수와 같다
-- from_date, to_date가 null이거나 to_date - from_date가 0~366일 밖이면 빈 결과다
create or replace function public.get_seat_stats(from_date date, to_date date)
returns table (
  seat int,
  standing_count bigint,
  cafe_zone_count bigint,
  drowsy_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.seat_no,
    count(*) filter (where s.category = 'standing'),
    count(*) filter (where s.category = 'cafe_zone'),
    count(*) filter (where s.category = 'drowsy')
  from public.patrol_logs l
  cross join lateral (
    select 'standing' as category, u.seat_no from unnest(l.standing) as u(seat_no)
    union all
    select 'cafe_zone', u.seat_no from unnest(l.cafe_zone) as u(seat_no)
    union all
    select 'drowsy', u.seat_no from unnest(l.drowsy) as u(seat_no)
  ) s
  where from_date is not null
    and to_date is not null
    and to_date - from_date between 0 and 366
    and l.business_date between from_date and to_date
  group by s.seat_no
  order by s.seat_no;
$$;

-- 요주의 좌석: as_of 영업일까지 window_days일(as_of 포함) 동안 졸음이 threshold회 이상인 좌석 번호 목록
-- 인자가 null이거나 window_days가 1~366 밖이거나 threshold가 1 미만이면 빈 배열이다
create or replace function public.get_watchlist_seats(as_of date, window_days int, threshold int)
returns int[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(t.seat_no order by t.seat_no), '{}'::int[])
  from (
    select u.seat_no
    from public.patrol_logs l
    cross join lateral unnest(l.drowsy) as u(seat_no)
    where as_of is not null
      and window_days between 1 and 366
      and threshold >= 1
      and l.business_date between as_of - (window_days - 1) and as_of
    group by u.seat_no
    having count(*) >= threshold
  ) t;
$$;

-- create or replace는 기존 권한을 유지하지만, 의도를 분명히 하려고 다시 적용한다
revoke execute on function public.get_seat_stats(date, date) from public;
revoke execute on function public.get_watchlist_seats(date, int, int) from public;
grant execute on function public.get_seat_stats(date, date) to anon, authenticated;
grant execute on function public.get_watchlist_seats(date, int, int) to anon, authenticated;
