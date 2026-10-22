-- 좌석별 카테고리 통계: 기간(영업일 기준) 안의 스탠딩·카페존·졸음 횟수. 자리비움은 제외한다
-- 한 기록 안에서 같은 좌석은 카테고리당 한 번만 들어 있어(private.is_valid_seats) 횟수는 기록 수와 같다
create function public.get_seat_stats(from_date date, to_date date)
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
  where l.business_date between from_date and to_date
  group by s.seat_no
  order by s.seat_no;
$$;

-- 요주의 좌석: as_of 영업일까지 window_days일(as_of 포함) 동안 졸음이 threshold회 이상인 좌석 번호 목록
-- 인자가 null이거나 window_days·threshold가 1 미만이면 빈 배열이다
create function public.get_watchlist_seats(as_of date, window_days int, threshold int)
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
      and window_days >= 1
      and threshold >= 1
      and l.business_date between as_of - (window_days - 1) and as_of
    group by u.seat_no
    having count(*) >= threshold
  ) t;
$$;

revoke execute on function public.get_seat_stats(date, date) from public;
revoke execute on function public.get_watchlist_seats(date, int, int) from public;
-- 일지 조회가 공개이므로(patrol_logs 공개 SELECT 규칙) 통계 함수도 anon에게 연다
grant execute on function public.get_seat_stats(date, date) to anon, authenticated;
grant execute on function public.get_watchlist_seats(date, int, int) to anon, authenticated;
