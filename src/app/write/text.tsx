import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmotionPicker } from '@/components/ui/EmotionPicker';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { DiaryPhoto, Emotion } from '@/domain/types';
import { pickAndCompressPhotos } from '@/lib/photos';
import { getUsageLimits } from '@/lib/usageLimits';
import { useAuth } from '@/state/useAuth';
import { useDiary } from '@/state/useDiary';
import { useSettings } from '@/state/useSettings';
import { radius, spacing } from '@/theme/tokens';

/** 직접 일기 쓰기 — 자동 임시 저장, 감정/태그/사진, 글자 수 표시 */
export default function TextWriteScreen() {
  const user = useAuth((s) => s.user);
  const language = useSettings((s) => s.learning.language);
  const autoSaveIntervalSec = useSettings((s) => s.diary.autoSaveIntervalSec);
  const diary = useDiary();

  const [title, setTitle] = useState(diary.draft?.title ?? '');
  const [text, setText] = useState(diary.draft?.text ?? '');
  const [emotion, setEmotion] = useState<Emotion>(diary.draft?.emotion ?? 'neutral');
  const [tagsInput, setTagsInput] = useState(diary.draft?.tags.join(', ') ?? '');
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const limits = getUsageLimits();

  // 자동 임시 저장
  const draftRef = useRef({ title, text, emotion, tagsInput });
  useEffect(() => {
    draftRef.current = { title, text, emotion, tagsInput };
  }, [title, text, emotion, tagsInput]);
  useEffect(() => {
    const interval = setInterval(() => {
      const d = draftRef.current;
      if (d.text.trim() || d.title.trim()) {
        diary.saveDraft({
          title: d.title,
          text: d.text,
          emotion: d.emotion,
          tags: d.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
          updatedAt: new Date().toISOString(),
        });
        setSavedAt(new Date().toLocaleTimeString());
      }
    }, Math.max(3, autoSaveIntervalSec) * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveIntervalSec]);

  const addPhotos = async () => {
    setPhotoError(null);
    const remaining = limits.maxPhotosPerDiary - photos.length;
    if (remaining <= 0) {
      setPhotoError(`사진은 일기당 최대 ${limits.maxPhotosPerDiary}장까지 넣을 수 있어요.`);
      return;
    }
    const picked = await pickAndCompressPhotos(remaining);
    if (picked === 'denied') {
      setPhotoError('사진 접근 권한이 필요해요. 기기 설정에서 허용해 주세요.');
      return;
    }
    setPhotos((prev) => {
      const merged = [...prev, ...picked];
      return merged.map((p, i) => ({ ...p, isCover: i === 0 }));
    });
  };

  const save = () => {
    if (!user || !text.trim()) return;
    const entry = diary.createEntry({
      ownerId: user.id,
      title: title.trim(),
      finalText: text.trim(),
      originalText: text.trim(),
      language,
      emotion,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      photos,
      inputMethod: 'typed',
    });
    diary.clearDraft();
    router.replace({ pathname: '/diary/[id]', params: { id: entry.id } });
  };

  const overLimit = text.length > limits.maxDiaryChars;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <TextField label="제목" placeholder="오늘의 제목 (선택)" value={title} onChangeText={setTitle} />

        <View style={{ gap: spacing.xs }}>
          <TextField
            label={language === 'en' ? '오늘의 일기 (영어)' : '오늘의 일기 (일본어)'}
            placeholder={
              language === 'en'
                ? 'Write about your day… 짧아도 괜찮아요!'
                : '今日のことを書いてみましょう。短くても大丈夫！'
            }
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            style={{ minHeight: 180, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" color={overLimit ? 'error' : 'secondary'}>
              {text.length.toLocaleString()} / {limits.maxDiaryChars.toLocaleString()}자
            </AppText>
            {savedAt ? (
              <AppText variant="caption" color="secondary">
                자동 저장됨 · {savedAt}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheading">오늘의 감정</AppText>
          <EmotionPicker value={emotion} onChange={setEmotion} />
        </View>

        <TextField
          label="태그"
          placeholder="쉼표로 구분 (예: 여행, 카페)"
          value={tagsInput}
          onChangeText={setTagsInput}
          autoCapitalize="none"
        />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheading">
            사진 ({photos.length}/{limits.maxPhotosPerDiary})
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {photos.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel="사진 삭제"
                onLongPress={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: 84, height: 84, borderRadius: radius.md }}
                  contentFit="cover"
                />
              </Pressable>
            ))}
            <Button small variant="secondary" label="+ 사진 추가" onPress={addPhotos} />
          </View>
          {photos.length > 0 ? (
            <AppText variant="caption" color="secondary">
              사진을 길게 누르면 삭제돼요. 업로드 전 압축되고 위치 정보(EXIF)는 제거돼요.
            </AppText>
          ) : null}
          {photoError ? (
            <AppText variant="caption" color="error">
              {photoError}
            </AppText>
          ) : null}
        </View>

        <Card soft>
          <AppText variant="caption" color="secondary">
            일기는 기본으로 비공개예요. 작성 중인 내용은 이 기기에 자동 저장돼요.
          </AppText>
        </Card>

        <Button label="저장하기" onPress={save} disabled={!text.trim() || overLimit} />
      </View>
    </Screen>
  );
}
