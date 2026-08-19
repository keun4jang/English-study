import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { KoHelp, helpFromKorean, isKoreanInput } from '@/ai/korean';
import { KoreanHelpCard } from '@/components/diary/KoreanHelpCard';
import { SentenceBuilderSheet } from '@/components/diary/SentenceBuilderSheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmotionPicker } from '@/components/ui/EmotionPicker';
import { ExitConfirmDialog } from '@/components/ui/ExitConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { DiaryPhoto, Emotion } from '@/domain/types';
import { pickAndCompressPhotos } from '@/lib/photos';
import { getUsageLimits } from '@/lib/usageLimits';
import { useUnsavedExit } from '@/lib/useUnsavedExit';
import { useAuth } from '@/state/useAuth';
import { useDiary } from '@/state/useDiary';
import { useSettings } from '@/state/useSettings';
import { speak } from '@/speech/tts';
import { radius, spacing } from '@/theme/tokens';

/** 지금 쓰고 있는 줄 — 빈 줄은 건너뛰고 마지막으로 글자가 있는 줄을 고른다 */
function lastLine(text: string): string {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? '';
}

/** 마지막 줄만 영어 문장으로 바꾼다 (앞에 써 둔 내용은 건드리지 않는다) */
function replaceLastLine(text: string, replacement: string): string {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim()) {
      lines[i] = replacement;
      return lines.join('\n');
    }
  }
  return replacement;
}

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
  /** 한글로 쓴 마지막 줄에 대한 예시 */
  const [koreanHelp, setKoreanHelp] = useState<KoHelp | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
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
    exit.leaveWithoutAsking(() =>
      router.replace({ pathname: '/diary/[id]', params: { id: entry.id } }),
    );
  };

  const overLimit = text.length > limits.maxDiaryChars;

  // 쓰던 게 있으면 뒤로가기로 그냥 빠져나가지 않게 한다.
  // (임시 저장이 돌고 있어 내용이 사라지진 않지만, 사용자가 그걸 알 수 없다)
  const exit = useUnsavedExit(Boolean(text.trim() || title.trim()));

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <TextField label="제목" placeholder="오늘의 제목 (선택)" value={title} onChangeText={setTitle} />

        <View style={{ gap: spacing.xs }}>
          <TextField
            label={language === 'en' ? '오늘의 일기 (영어)' : '오늘의 일기 (일본어)'}
            placeholder={
              language === 'en'
                ? 'Write about your day… 한국어로 써 두고 아래에서 영어 예시를 받아도 돼요'
                : '今日のことを書いてみましょう。韓国語で書いてから例文をもらってもOK'
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

        {/*
          한글로 써 두었을 때 예시를 만들어 준다.
          일기 전체가 아니라 **마지막 줄**로 만든다 — 여러 문장을 한 번에 넘기면 조각이 뒤섞여
          엉뚱한 문장이 나온다. 지금 쓰고 있는 줄이 지금 막힌 줄이다.
        */}
        {koreanHelp ? (
          <KoreanHelpCard
            help={koreanHelp}
            language={language}
            onUse={(sentence) => {
              setText((prev) => replaceLastLine(prev, sentence));
              setKoreanHelp(null);
            }}
            onSpeak={(sentence) => speak(sentence, { language })}
            onOpenBuilder={() => setBuilderOpen(true)}
            onDismiss={() => setKoreanHelp(null)}
          />
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            size="compact"
            variant="ghost"
            icon="help-circle"
            label={
              isKoreanInput(lastLine(text))
                ? `${language === 'en' ? '영어' : '일본어'}로 어떻게 말해요?`
                : '문장 만들기'
            }
            onPress={() => {
              const line = lastLine(text);
              if (isKoreanInput(line)) setKoreanHelp(helpFromKorean(line, language));
              else setBuilderOpen(true);
            }}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">오늘의 감정</AppText>
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
          <AppText variant="label">
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

      <SentenceBuilderSheet
        visible={builderOpen}
        language={language}
        onClose={() => setBuilderOpen(false)}
        onUse={(sentence) =>
          setText((prev) => (prev.trim() ? `${prev.replace(/\s+$/, '')}\n${sentence}` : sentence))
        }
        onSpeak={(sentence) => speak(sentence, { language })}
      />

      <ExitConfirmDialog
        visible={exit.pending}
        title="쓰던 일기를 저장할까요?"
        description="저장하지 않고 나가도 쓰던 내용은 임시 보관돼요. 홈에서 이어서 쓸 수 있어요."
        saveLabel="저장하고 나가기"
        onSave={save}
        discardLabel="저장 안 하고 나가기"
        onDiscard={exit.confirm}
        onCancel={exit.cancel}
      />
    </Screen>
  );
}
