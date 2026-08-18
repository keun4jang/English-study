-- Mellow Diary — 초기 스키마 (Phase 2에서 supabase db push로 적용)
-- 모든 사용자 데이터 테이블은 0002_rls.sql에서 RLS가 활성화된다.

create extension if not exists pgcrypto;

-- ---------- 공통 ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- 프로필 ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  friend_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- 학습/음성/일기/디자인/알림 설정 전체 (클라이언트 Zod로 검증된 JSON)
  settings jsonb not null default '{}'::jsonb,
  ai_consent_at timestamptz,          -- AI 처리 동의 시각
  voice_storage_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------- 일기 ----------
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  original_text text not null default '',
  corrected_text text,
  final_text text not null check (char_length(final_text) <= 20000),
  translation_ko text,
  local_date date not null,            -- 사용자 시간대 기준 날짜 (달력 표시용)
  emotion text not null default 'neutral',
  weather text not null default 'none',
  tags text[] not null default '{}',
  visibility text not null default 'private'
    check (visibility in ('private', 'selected-friends', 'all-friends', 'link')),
  is_favorite boolean not null default false,
  language_code text not null check (language_code in ('en', 'ja')),
  input_method text not null default 'typed',
  conversation_id uuid,
  status text not null default 'saved' check (status in ('draft', 'saved', 'trashed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index diary_entries_owner_date_idx on public.diary_entries (owner_id, local_date desc);
create index diary_entries_owner_status_idx on public.diary_entries (owner_id, status);
create index diary_entries_tags_idx on public.diary_entries using gin (tags);
-- 기본 텍스트 검색 (유료 검색 서비스 없이 PostgreSQL 기본 기능 사용)
create index diary_entries_search_idx on public.diary_entries
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(final_text, '')));
create trigger diary_entries_updated before update on public.diary_entries
  for each row execute function public.set_updated_at();

create table public.diary_entry_versions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  final_text text not null,
  title text not null default '',
  created_at timestamptz not null default now()
);
create index diary_entry_versions_entry_idx on public.diary_entry_versions (entry_id, created_at desc);

create table public.diary_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- 경로에 원본 파일명/이메일 금지: {owner_id}/{photo_id}.jpg 형식 (UUID 기반)
  storage_path text not null,
  is_cover boolean not null default false,
  byte_size integer not null check (byte_size <= 1048576),  -- 압축 후 최대 1MB
  created_at timestamptz not null default now()
);
create index diary_photos_entry_idx on public.diary_photos (entry_id);
create index diary_photos_owner_idx on public.diary_photos (owner_id);

-- ---------- AI 대화 ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  language_code text not null check (language_code in ('en', 'ja')),
  local_date date not null,
  status text not null default 'active' check (status in ('active', 'finished')),
  summary text,                        -- 긴 대화 컨텍스트 절약용 요약
  created_at timestamptz not null default now()
);
create index conversations_owner_idx on public.conversations (owner_id, created_at desc);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),  -- system은 클라이언트가 만들 수 없음
  content text not null check (char_length(content) <= 4000),
  translation_ko text,
  created_at timestamptz not null default now()
);
create index conversation_messages_conv_idx on public.conversation_messages (conversation_id, created_at);

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.conversation_messages (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  severity text not null check (severity in ('correct', 'minor', 'major')),
  original text not null,
  corrected text not null,
  explanation_ko text not null default '',
  changed_parts jsonb not null default '[]'::jsonb,
  key_expressions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index corrections_owner_idx on public.corrections (owner_id, created_at desc);

-- ---------- 학습 ----------
create table public.saved_expressions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  expression text not null,
  meaning_ko text not null default '',
  example text not null default '',
  language_code text not null check (language_code in ('en', 'ja')),
  source_diary_id uuid references public.diary_entries (id) on delete set null,
  is_favorite boolean not null default false,
  next_review_date date not null,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, expression, language_code)
);
create index saved_expressions_review_idx on public.saved_expressions (owner_id, next_review_date);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  target_sentence text not null,
  recognized_text text not null,
  similarity numeric(4,3) not null check (similarity between 0 and 1),
  passed boolean not null,
  language_code text not null check (language_code in ('en', 'ja')),
  created_at timestamptz not null default now()
);
create index practice_attempts_owner_idx on public.practice_attempts (owner_id, created_at desc);

-- ---------- 친구/공유 ----------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create trigger friendships_updated before update on public.friendships
  for each row execute function public.set_updated_at();

create table public.diary_shares (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  shared_with_id uuid not null references public.profiles (id) on delete cascade,
  include_translation boolean not null default true,
  include_photos boolean not null default true,
  include_corrections boolean not null default false,  -- 원본 실수/교정 기록은 기본 비공유
  created_at timestamptz not null default now(),
  unique (entry_id, shared_with_id)
);
create index diary_shares_shared_with_idx on public.diary_shares (shared_with_id);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- 추측하기 어려운 토큰 (서버에서 생성)
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index share_links_entry_idx on public.share_links (entry_id);

create table public.diary_reactions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  unique (entry_id, user_id, emoji)
);

create table public.diary_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index diary_comments_entry_idx on public.diary_comments (entry_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null check (target_kind in ('diary', 'comment', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- ---------- 사용량/운영 ----------
create table public.usage_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  ai_turns integer not null default 0,
  diary_generations integer not null default 0,
  estimated_input_chars integer not null default 0,
  -- 프롬프트 원문은 저장하지 않는다 (개인정보 보호)
  primary key (user_id, usage_date)
);

create table public.ai_request_log (
  -- 중복 과금 방지: 클라이언트 idempotency key
  request_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index ai_request_log_user_idx on public.ai_request_log (user_id, created_at desc);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 관리자 목록 (관리자 권한은 서버에서 이 테이블로 검증)
create table public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
