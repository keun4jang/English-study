# Row Level Security

`supabase/migrations/0002_rls.sql` 참고. 모든 사용자 데이터 테이블에 RLS 활성화.

## 원칙

- 본인 데이터만 읽고 쓰기 (기본)
- 공유된 일기만 권한에 따라 읽기 — 판정 로직은 `can_view_entry()` 함수 하나로 통일
- 친구 관계/요청은 당사자만 조회, 수락/거절은 수신자만
- 댓글은 해당 일기를 볼 수 있는 사람만 조회/작성, 삭제는 작성자 또는 일기 소유자
- 차단 관계에서는 공유·요청·상호작용 차단 (`is_blocked()`)
- 관리자 권한은 `admin_users` 테이블로 서버에서 검증
- `usage_daily`, `ai_request_log`, `notifications`, `corrections` INSERT는 서버(service role)만
- Storage: private 버킷 `diary-photos`, 경로 `{owner_uuid}/{photo_uuid}.jpg`

## `can_view_entry(entry, viewer)` 판정

1. 소유자 본인 → 항상 허용
2. 휴지통/초안(`status != 'saved'`) → 타인 불가
3. 차단 관계 → 불가
4. `all-friends` + 수락된 친구 → 허용
5. `selected-friends` + `diary_shares`에 공유 행 존재 → 허용
6. `link` 공유는 RLS가 아닌 서버 함수에서 토큰 검증 (만료/폐기 확인)

## 성능

- 정책이 참조하는 컬럼에 인덱스 존재: `friendships(addressee_id, status)`,
  `diary_shares(shared_with_id)`, `diary_photos(entry_id)` 등
- 헬퍼 함수는 `stable` + `security definer`로 선언해 플래너 캐싱 활용

## RLS 테스트 시나리오 (Supabase 연결 후 실행)

SQL 또는 pgTAP으로 다음을 검증한다 (`supabase test db` 권장):

1. ❌ 사용자 A가 사용자 B의 비공개(`private`) 일기 SELECT → 0행
2. ✅ B가 A에게 `selected-friends`로 공유한 일기만 A가 SELECT 가능
3. ❌ 공유 취소(`diary_shares` DELETE) 후 A의 SELECT → 0행
4. ❌ A가 B의 사진(`diary_photos` / storage.objects) DELETE → 거부
5. ❌ 차단 후: 친구 요청 INSERT 거부, 공유 일기 SELECT 0행, 댓글 INSERT 거부
6. ❌ 일반 사용자가 `feature_flags` / `app_config` UPDATE → 거부
7. ❌ 클라이언트가 `conversation_messages`에 role='system' INSERT → check 위반
8. ❌ 클라이언트가 `usage_daily` UPDATE/INSERT → 정책 없음(거부)

예시 (psql, JWT 시뮬레이션):

```sql
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<user-a-uuid>', 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) from diary_entries where owner_id = '<user-b-uuid>'; -- 기대: 0
rollback;
```
