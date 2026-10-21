-- client_request_id는 완료 RPC의 멱등 키(DB 전용 컬럼)이며 화면이 쓰지 않으므로 공개 조회에서 제외한다.
-- 테이블 단위 SELECT를 컬럼 단위 SELECT로 바꾼다(RPC는 SECURITY DEFINER라 영향 없음).
-- 컬럼을 추가하면 화면에서 읽어야 하는 경우에만 이 목록에 명시적으로 추가한다.
revoke select on table public.patrol_logs from anon, authenticated;
grant select (id, business_date, patrolled_at, author_id, standing, cafe_zone, drowsy, away, memo)
  on table public.patrol_logs to anon, authenticated;
