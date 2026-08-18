-- Mellow Diary — Row Level Security 정책
-- 원칙: 본인 데이터만 읽고 쓰기, 공유된 일기만 권한에 따라 읽기, 차단 관계 차단.
-- Service Role Key는 서버 전용이며 클라이언트에 절대 노출하지 않는다.

-- ---------- 헬퍼 함수 ----------

-- 두 사용자가 서로 차단 관계인지
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocked_users
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- 두 사용자가 수락된 친구인지
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

-- viewer가 해당 일기를 볼 수 있는지 (공유 규칙의 단일 진실 공급원)
create or replace function public.can_view_entry(entry public.diary_entries, viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    entry.owner_id = viewer
    or (
      entry.status = 'saved'
      and not public.is_blocked(entry.owner_id, viewer)
      and (
        (entry.visibility = 'all-friends' and public.are_friends(entry.owner_id, viewer))
        or (entry.visibility = 'selected-friends' and exists (
          select 1 from diary_shares s
          where s.entry_id = entry.id and s.shared_with_id = viewer
        ))
      )
    );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = uid);
$$;

-- ---------- RLS 활성화 ----------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_entry_versions enable row level security;
alter table public.diary_photos enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.corrections enable row level security;
alter table public.saved_expressions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.friendships enable row level security;
alter table public.diary_shares enable row level security;
alter table public.share_links enable row level security;
alter table public.diary_reactions enable row level security;
alter table public.diary_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.blocked_users enable row level security;
alter table public.reports enable row level security;
alter table public.usage_daily enable row level security;
alter table public.ai_request_log enable row level security;
alter table public.feature_flags enable row level security;
alter table public.app_config enable row level security;
alter table public.admin_users enable row level security;

-- ---------- profiles ----------
-- 프로필은 친구 코드 검색/친구 표시를 위해 로그인 사용자에게 조회 허용 (닉네임/코드만 저장됨)
create policy profiles_select on public.profiles
  for select using (auth.uid() is not null);
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = id);
create policy profiles_delete on public.profiles
  for delete using (auth.uid() = id);

-- ---------- user_settings ----------
create policy user_settings_all on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- diary_entries ----------
create policy diary_entries_select on public.diary_entries
  for select using (public.can_view_entry(diary_entries, auth.uid()));
create policy diary_entries_insert on public.diary_entries
  for insert with check (auth.uid() = owner_id);
create policy diary_entries_update on public.diary_entries
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy diary_entries_delete on public.diary_entries
  for delete using (auth.uid() = owner_id);

-- ---------- diary_entry_versions ----------
create policy diary_entry_versions_all on public.diary_entry_versions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- diary_photos ----------
-- 사진 조회는 일기 조회 권한과 동일. 쓰기/삭제는 소유자만.
create policy diary_photos_select on public.diary_photos
  for select using (
    exists (
      select 1 from public.diary_entries e
      where e.id = diary_photos.entry_id and public.can_view_entry(e, auth.uid())
    )
  );
create policy diary_photos_insert on public.diary_photos
  for insert with check (auth.uid() = owner_id);
create policy diary_photos_delete on public.diary_photos
  for delete using (auth.uid() = owner_id);

-- ---------- conversations / messages / corrections (본인만) ----------
create policy conversations_all on public.conversations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy conversation_messages_select on public.conversation_messages
  for select using (auth.uid() = owner_id);
create policy conversation_messages_insert on public.conversation_messages
  for insert with check (auth.uid() = owner_id and role in ('user', 'assistant'));
create policy corrections_select on public.corrections
  for select using (auth.uid() = owner_id);
-- corrections INSERT는 서버(Edge Function, service role)만 수행

-- ---------- saved_expressions / practice_attempts ----------
create policy saved_expressions_all on public.saved_expressions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy practice_attempts_all on public.practice_attempts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- friendships ----------
-- 당사자만 조회. 요청 생성은 requester 본인 + 차단 관계 아님.
create policy friendships_select on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));
create policy friendships_insert on public.friendships
  for insert with check (
    auth.uid() = requester_id
    and not public.is_blocked(requester_id, addressee_id)
  );
-- 상태 변경(수락/거절)은 수신자만, 삭제는 당사자 둘 다 가능
create policy friendships_update on public.friendships
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy friendships_delete on public.friendships
  for delete using (auth.uid() in (requester_id, addressee_id));

-- ---------- diary_shares ----------
create policy diary_shares_select on public.diary_shares
  for select using (auth.uid() in (owner_id, shared_with_id));
create policy diary_shares_insert on public.diary_shares
  for insert with check (
    auth.uid() = owner_id
    and public.are_friends(owner_id, shared_with_id)
    and not public.is_blocked(owner_id, shared_with_id)
    and exists (select 1 from public.diary_entries e where e.id = entry_id and e.owner_id = auth.uid())
  );
create policy diary_shares_delete on public.diary_shares
  for delete using (auth.uid() = owner_id);

-- ---------- share_links (읽기 전용 외부 링크; 조회는 서버 함수 경유) ----------
create policy share_links_all on public.share_links
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- diary_reactions ----------
create policy diary_reactions_select on public.diary_reactions
  for select using (
    exists (
      select 1 from public.diary_entries e
      where e.id = diary_reactions.entry_id and public.can_view_entry(e, auth.uid())
    )
  );
create policy diary_reactions_insert on public.diary_reactions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.diary_entries e
      where e.id = entry_id and public.can_view_entry(e, auth.uid())
    )
  );
create policy diary_reactions_delete on public.diary_reactions
  for delete using (auth.uid() = user_id);

-- ---------- diary_comments ----------
-- 해당 공유 일기를 볼 수 있는 사람만 조회/작성. 삭제는 작성자 또는 일기 소유자.
create policy diary_comments_select on public.diary_comments
  for select using (
    exists (
      select 1 from public.diary_entries e
      where e.id = diary_comments.entry_id and public.can_view_entry(e, auth.uid())
    )
  );
create policy diary_comments_insert on public.diary_comments
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.diary_entries e
      where e.id = entry_id and public.can_view_entry(e, auth.uid())
    )
  );
create policy diary_comments_delete on public.diary_comments
  for delete using (
    auth.uid() = author_id
    or exists (
      select 1 from public.diary_entries e
      where e.id = diary_comments.entry_id and e.owner_id = auth.uid()
    )
  );

-- ---------- notifications ----------
create policy notifications_select on public.notifications
  for select using (auth.uid() = user_id);
create policy notifications_update on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- INSERT는 서버만 수행

-- ---------- blocked_users ----------
create policy blocked_users_all on public.blocked_users
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- ---------- reports ----------
create policy reports_insert on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy reports_select_own on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin(auth.uid()));

-- ---------- usage_daily / ai_request_log ----------
-- 본인 사용량 조회만 허용, 기록은 서버(service role)만 수행
create policy usage_daily_select on public.usage_daily
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy ai_request_log_select on public.ai_request_log
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ---------- feature_flags / app_config ----------
-- 읽기는 로그인 사용자, 변경은 서버/관리자만 (service role 경유)
create policy feature_flags_select on public.feature_flags
  for select using (auth.uid() is not null);
create policy app_config_select on public.app_config
  for select using (auth.uid() is not null);

-- ---------- admin_users ----------
create policy admin_users_select on public.admin_users
  for select using (public.is_admin(auth.uid()));

-- ---------- Storage (diary-photos 버킷, 비공개) ----------
-- 버킷 생성: supabase 대시보드 또는 CLI에서 private 버킷 'diary-photos' 생성 후 적용.
-- 경로 규칙: {owner_uuid}/{photo_uuid}.jpg — 원본 파일명/이메일 금지.
create policy diary_photos_storage_select on storage.objects
  for select using (
    bucket_id = 'diary-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.diary_photos p
        join public.diary_entries e on e.id = p.entry_id
        where p.storage_path = name and public.can_view_entry(e, auth.uid())
      )
    )
  );
create policy diary_photos_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'diary-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy diary_photos_storage_delete on storage.objects
  for delete using (
    bucket_id = 'diary-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
