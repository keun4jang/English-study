import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { emotionEmoji } from '@/components/ui/EmotionPicker';
import { Screen } from '@/components/ui/Screen';
import { formatDateKo } from '@/lib/dates';
import { speak, stopSpeaking } from '@/speech/tts';
import { useDiary } from '@/state/useDiary';
import { useSettings } from '@/state/useSettings';
import { radius, spacing } from '@/theme/tokens';

export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary();
  const speechRate = useSettings((s) => s.voice.speechRate);
  const entry = useDiary((s) => s.entries.find((e) => e.id === id));
  const [showOriginal, setShowOriginal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!entry) {
    return (
      <Screen>
        <EmptyState
          emoji="🍂"
          title="일기를 찾을 수 없어요"
          description="삭제되었거나 이동된 일기예요."
          actionLabel="돌아가기"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const hasCorrectionDiff =
    entry.correctedText && entry.correctedText !== entry.originalText;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color="secondary">
            {formatDateKo(entry.localDate)} · {entry.language === 'en' ? '🇺🇸 영어' : '🇯🇵 일본어'}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText style={{ fontSize: 24, lineHeight: 32 }}>{emotionEmoji(entry.emotion)}</AppText>
            <AppText variant="title" style={{ flex: 1 }}>
              {entry.title || (entry.language === 'en' ? 'Untitled' : '無題')}
            </AppText>
          </View>
        </View>

        {entry.photos.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {entry.photos.map((p) => (
              <Image
                key={p.id}
                source={{ uri: p.uri }}
                style={{ width: 100, height: 100, borderRadius: radius.md }}
                contentFit="cover"
                accessibilityLabel="일기 사진"
              />
            ))}
          </View>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <AppText variant="body">{entry.finalText}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button
              small
              variant="secondary"
              label="🔊 듣기"
              onPress={() => speak(entry.finalText, { language: entry.language, rate: speechRate })}
            />
            <Button
              small
              variant="secondary"
              label="🐢 천천히"
              onPress={() => speak(entry.finalText, { language: entry.language, extraSlow: true })}
            />
            <Button small variant="ghost" label="⏹ 중지" onPress={() => stopSpeaking()} />
          </View>
        </Card>

        {entry.translationKo ? (
          <Card soft>
            <AppText variant="caption" color="secondary">
              한국어 뜻
            </AppText>
            <AppText variant="bodySmall" color="secondary">
              {entry.translationKo}
            </AppText>
          </Card>
        ) : null}

        {hasCorrectionDiff ? (
          <Card soft style={{ gap: spacing.sm }}>
            <Button
              small
              variant="ghost"
              label={showOriginal ? '원문 접기 ▲' : '내가 쓴 원문 보기 ▼'}
              onPress={() => setShowOriginal((v) => !v)}
            />
            {showOriginal ? (
              <AppText variant="bodySmall" color="secondary">
                {entry.originalText}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        {entry.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {entry.tags.map((t) => (
              <AppText key={t} variant="bodySmall" color="accent">
                #{t}
              </AppText>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button
            small
            variant="secondary"
            label={entry.isFavorite ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기'}
            onPress={() => diary.toggleFavorite(entry.id)}
          />
          <Button
            small
            variant="secondary"
            label="✏️ 수정"
            onPress={() => router.push({ pathname: '/diary/edit/[id]', params: { id: entry.id } })}
          />
          {!confirmDelete ? (
            <Button small variant="ghost" label="🗑 휴지통으로" onPress={() => setConfirmDelete(true)} />
          ) : (
            <Button
              small
              variant="danger"
              label="정말 휴지통으로 보낼까요?"
              onPress={() => {
                diary.trashEntry(entry.id);
                router.back();
              }}
            />
          )}
        </View>

        <AppText variant="caption" color="secondary">
          공개 범위: {entry.visibility === 'private' ? '🔒 나만 보기' : entry.visibility} · 친구 공유는
          Supabase 연결(Phase 3) 후 제공돼요.
        </AppText>
      </View>
    </Screen>
  );
}
