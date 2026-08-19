import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DiaryBodyText, DiaryPaper, DiaryTitleText } from '@/components/ui/DiaryPaper';
import { EmotionIcon, emotionLabel } from '@/components/ui/EmotionPicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { formatDateKo } from '@/lib/dates';
import { shareDiary } from '@/lib/shareDiary';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  if (!entry) {
    return (
      <Screen>
        <EmptyState
          icon="file-text"
          title="일기를 찾을 수 없어요"
          description="삭제되었거나 이동된 일기예요."
          actionLabel="돌아가기"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const hasCorrectionDiff = entry.correctedText && entry.correctedText !== entry.originalText;

  return (
    <Screen>
      <View style={{ gap: spacing.x20 }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color="secondary">
            {formatDateKo(entry.localDate)} · {entry.language === 'en' ? '영어' : '일본어'}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <EmotionIcon emotion={entry.emotion} size={22} />
            <AppText variant="caption" color="secondary">
              {emotionLabel(entry.emotion)}
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

        {/* 완성된 종이 일기 */}
        <DiaryPaper>
          <View style={{ gap: spacing.md }}>
            {entry.title ? <DiaryTitleText language={entry.language}>{entry.title}</DiaryTitleText> : null}
            <DiaryBodyText language={entry.language}>{entry.finalText}</DiaryBodyText>
          </View>
        </DiaryPaper>

        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button
            size="compact"
            icon="volume-2"
            label="보통 속도로 듣기"
            onPress={() => speak(entry.finalText, { language: entry.language, rate: speechRate })}
          />
          <Button
            size="compact"
            variant="secondary"
            icon="volume-1"
            label="천천히 듣기"
            onPress={() => speak(entry.finalText, { language: entry.language, extraSlow: true })}
          />
          <Button
            size="compact"
            variant="ghost"
            icon="more-horizontal"
            label="더보기"
            onPress={() => setMoreOpen((v) => !v)}
          />
        </View>

        {moreOpen ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              size="compact"
              variant="ghost"
              icon="square"
              label="재생 중지"
              onPress={() => stopSpeaking()}
            />
            <Button
              size="compact"
              variant="ghost"
              icon={entry.isFavorite ? 'check' : 'bookmark'}
              label={entry.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
              onPress={() => diary.toggleFavorite(entry.id)}
            />
            <Button
              size="compact"
              variant="ghost"
              icon="edit-3"
              label="수정"
              onPress={() => router.push({ pathname: '/diary/edit/[id]', params: { id: entry.id } })}
            />
            <Button
              size="compact"
              variant="ghost"
              icon="share-2"
              label="일기 공유하기"
              onPress={async () => {
                setShareStatus(null);
                const result = await shareDiary(entry, { includeTranslation: true });
                if (result === 'copied') setShareStatus('공유를 지원하지 않아 내용을 복사했어요. 원하는 곳에 붙여넣어 주세요.');
                else if (result === 'failed') setShareStatus('공유하지 못했어요. 잠시 후 다시 시도해 주세요.');
                else setShareStatus(null);
              }}
            />
            {shareStatus ? (
              <AppText variant="bodySmall" color="secondary">
                {shareStatus}
              </AppText>
            ) : null}
            {!confirmDelete ? (
              <Button
                size="compact"
                variant="ghost"
                icon="trash-2"
                label="휴지통으로 보내기"
                onPress={() => setConfirmDelete(true)}
              />
            ) : (
              <Card variant="soft" style={{ gap: spacing.sm }}>
                <AppText variant="bodySmall" color="secondary">
                  이 일기({entry.title || entry.localDate})가 휴지통으로 이동해요. 휴지통에서는
                  복원할 수 있어요.
                </AppText>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    size="compact"
                    variant="danger"
                    icon="trash-2"
                    label="휴지통으로 보내기"
                    onPress={() => {
                      diary.trashEntry(entry.id);
                      router.back();
                    }}
                  />
                  <Button size="compact" variant="ghost" label="취소" onPress={() => setConfirmDelete(false)} />
                </View>
              </Card>
            )}
          </View>
        ) : null}

        {entry.translationKo ? (
          <Card variant="soft" style={{ gap: spacing.xs }}>
            <AppText variant="caption" color="secondary">
              한국어 뜻
            </AppText>
            <AppText variant="bodySmall" color="secondary">
              {entry.translationKo}
            </AppText>
          </Card>
        ) : null}

        {hasCorrectionDiff ? (
          <Card variant="soft" style={{ gap: spacing.sm }}>
            <Button
              size="compact"
              variant="ghost"
              icon={showOriginal ? 'chevron-up' : 'chevron-down'}
              label={showOriginal ? '원문 접기' : '내가 쓴 원문 보기'}
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

        <AppText variant="caption" color="secondary">
          공개 범위: {entry.visibility === 'private' ? '나만 보기' : entry.visibility} · 이 일기는 기기
          안에만 있어요. 더보기 → 일기 공유하기를 누른 순간에만 밖으로 나갑니다 (사진 제외).
        </AppText>
      </View>
    </Screen>
  );
}
