import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmotionPicker } from '@/components/ui/EmotionPicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { getUsageLimits } from '@/lib/usageLimits';
import { useDiary } from '@/state/useDiary';
import { spacing } from '@/theme/tokens';

export default function DiaryEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useDiary((s) => s.entries.find((e) => e.id === id));
  const updateEntry = useDiary((s) => s.updateEntry);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [text, setText] = useState(entry?.finalText ?? '');
  const [emotion, setEmotion] = useState(entry?.emotion ?? 'neutral');
  const [tagsInput, setTagsInput] = useState(entry?.tags.join(', ') ?? '');
  const limits = getUsageLimits();

  if (!entry) {
    return (
      <Screen>
        <EmptyState icon="file-text" title="일기를 찾을 수 없어요" actionLabel="돌아가기" onAction={() => router.back()} />
      </Screen>
    );
  }

  const save = () => {
    updateEntry(entry.id, {
      title: title.trim(),
      finalText: text.trim(),
      emotion,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    });
    router.back();
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <TextField label="제목" value={title} onChangeText={setTitle} />
        <View style={{ gap: spacing.xs }}>
          <TextField
            label="내용"
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            style={{ minHeight: 180, textAlignVertical: 'top' }}
          />
          <AppText variant="caption" color="secondary">
            {text.length.toLocaleString()} / {limits.maxDiaryChars.toLocaleString()}자
          </AppText>
        </View>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">감정</AppText>
          <EmotionPicker value={emotion} onChange={setEmotion} />
        </View>
        <TextField label="태그" value={tagsInput} onChangeText={setTagsInput} autoCapitalize="none" />
        <Button
          label="수정 완료"
          onPress={save}
          disabled={!text.trim() || text.length > limits.maxDiaryChars}
        />
      </View>
    </Screen>
  );
}
