# 데이터베이스 설계

`supabase/migrations/0001_init.sql` 참고. snake_case 일관 사용.

## 테이블 요약

| 테이블 | 용도 | 핵심 컬럼/제약 |
|---|---|---|
| `profiles` | 프로필 | `friend_code` unique, auth.users FK |
| `user_settings` | 설정 JSON | `ai_consent_at`(AI 동의 기록), `voice_storage_opt_in` |
| `diary_entries` | 일기 | `local_date`(사용자 시간대 날짜), `visibility`, `status`(soft delete), 20,000자 check |
| `diary_entry_versions` | 수정 이력 | 이전 버전 복원용 |
| `diary_photos` | 사진 메타 | UUID 경로, 1MB check |
| `conversations` | AI 대화 | `summary`(컨텍스트 절약) |
| `conversation_messages` | 메시지 | role은 user/assistant만 (system 클라이언트 생성 불가) |
| `corrections` | 교정 기록 | severity check, JSONB 파트/표현 |
| `saved_expressions` | 단어장 | `next_review_date` 간격 반복, (owner, expression, lang) unique |
| `practice_attempts` | 재말하기 기록 | similarity 0~1 check |
| `friendships` | 친구 관계+요청 통합 | status: pending/accepted/declined, 쌍 unique |
| `diary_shares` | 일기별 친구 공유 | `include_corrections` 기본 false (교정 기록 기본 비공유) |
| `share_links` | 외부 읽기 전용 링크 | 랜덤 토큰, `expires_at`, `revoked_at` |
| `diary_reactions` / `diary_comments` | 공감/댓글 | 댓글 1,000자 check, soft delete |
| `notifications` | 알림 | 서버만 INSERT |
| `blocked_users` / `reports` | 차단/신고 | UGC 안전장치 |
| `usage_daily` | 일일 AI 사용량 | 프롬프트 원문 저장 안 함 |
| `ai_request_log` | idempotency | request_id PK로 중복 과금 방지 |
| `feature_flags` / `app_config` | 운영 설정 | 변경은 서버/관리자만 |
| `admin_users` | 관리자 명단 | 서버 검증용 |

## 날짜/시간대 처리

- 저장: `created_at` 등은 UTC `timestamptz`
- 달력 표시: `local_date`는 **작성 시점 사용자 로컬 날짜**를 클라이언트가 계산해 저장
  (`src/lib/dates.ts` `toLocalDateKey`) — 자정 근처 작성 시에도 사용자가 인지한 날짜 유지
- 하루 여러 일기 허용 (unique 제약 없음)

## 인덱스 전략

- 목록/달력: `(owner_id, local_date desc)`
- 검색: `to_tsvector('simple', title || final_text)` GIN — 유료 검색 서비스 없이 기본 검색
- 태그: `tags` GIN
- 페이지네이션: `local_date` + `id` 커서 방식 권장 (offset 금지)
