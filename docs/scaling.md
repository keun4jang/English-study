# 확장성과 비용 — 정직한 분석

"1만 명 가입 가능"과 "1만 명이 동시에 무제한 AI를 사용"은 완전히 다른 문제다.
이 앱은 전자를 목표로 설계했고, 후자는 무료로 불가능하다.

> ⚠️ 아래 수치는 설계 판단을 위한 추정이며, 실제 비용은 각 서비스의
> **현재 공식 가격표**(anthropic.com/pricing, supabase.com/pricing)에서 반드시 확인할 것.

## 단계별 병목 예측

### 가입자 ~100명 (친구 테스트)

| 자원 | 상태 |
|---|---|
| AI API | **유일한 실비용.** 100명 × 20턴/일 상한 → 상한만 관리하면 소액 |
| Supabase DB (Free 500MB) | 여유 (텍스트 위주) |
| 사진 Storage (Free 1GB) | 1MB × 3장 × 100명 ≈ 수백 MB — 압축 필수 |
| Auth MAU (Free 50,000) | 여유 |
| Edge Function 호출 (Free 500K/월) | 여유 |

### MAU ~1,000명

- **1순위 병목: AI API 비용.** 1,000명 × 20턴 = 최대 2만 요청/일.
  → 대응: 일일 한도 하향(관리자 설정), 저가 모델(Haiku), 응답 토큰 제한,
  요약+최근 메시지만 전송(이미 구현), 캐싱.
- 2순위: Storage 용량/egress — 썸네일 도입, 사진 수 제한 유지
- Supabase Free의 프로젝트 일시정지(1주 미사용) 주의 — 유료 전환 판단 시점

### MAU ~10,000명

- AI API: 무료 불가 영역. 유료화/광고/한도 차등(프리미엄) 없이는 지속 불가 —
  이 사실을 숨기지 않는 것이 이 문서의 목적이다.
- DB: 연결 수(pgBouncer), 인덱스 재점검, `usage_daily` 파티셔닝 검토
- Storage egress: CDN/R2 이전 (Storage Adapter로 교체 지점 확보됨)
- Edge Function 동시성: 큐잉/동시성 제한 필요
- Auth: Free 한도 내이나 소셜 로그인 rate limit 확인

## 이미 구현된 확장 대비 구조

- Stateless API (Edge Function), Provider/Storage Adapter, Feature Flag 테이블
- 사용자별/전역 사용량 제한 + graceful degradation (한도 초과 → 일반 일기 모드)
- idempotency key (중복 과금 방지), 재시도 1회 제한
- 대화 요약 + 최근 8개 메시지만 AI 전달, 프롬프트 길이 제한
- 이미지 클라이언트 압축(1MB↓), DB 인덱스, cursor pagination 설계(docs/database.md)

## 부하 테스트 (로컬 전용)

`scripts/load-test.js` — **자신이 소유한 로컬/테스트 환경에서만 실행할 것.**
프로덕션이나 제3자 서버 대상 실행 금지.

```bash
# 로컬 supabase (supabase start) 대상 예시
node scripts/load-test.js --base http://127.0.0.1:54321 --anon <local-anon-key>
```

시나리오: 일기 목록 조회(pagination) / 일기 저장 / 공유 목록 조회 /
AI 요청 rate limit(429 확인) — 각 시나리오의 p50/p95 지연과 오류율을 출력한다.
