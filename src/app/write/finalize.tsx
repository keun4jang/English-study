import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmotionPicker } from '@/components/ui/EmotionPicker';
import { OptionGroup } from '@/components/ui/OptionGroup';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Emotion } from '@/domain/types';
import { useAuth } from '@/state/useAuth';
import { useDiary } from '@/state/useDiary';
import { useFinalize } from '@/state/useFinalize';
import { spacing } from '@/theme/tokens';

type VersionChoice = 'simple' | 'natural' | 'original' | 'custom';

/**
 * 최종 일기 미리보기 및 저장.
 * AI가 만든 문장은 반드시 사용자 미리보기와 승인을 거쳐 저장된다.
 */
export default function FinalizeScreen() {
  const { result, conversationId, language, originalText, clear } = useFinalize();
  const user = useAuth((s) => s.user);
  const createEntry = useDiary((s) => s.createEntry);

  const [choice, setChoice] = useState<VersionChoice>('natural');
  const [title, setTitle] = useState(result?.titleCandidates[0] ?? '');
  const [customText, setCustomText] = useState(result?.naturalVersion ?? '');
  const [emotion, setEmotion] = useState<Emotion>('calm');

  if (!result || !user) {
    return (
      <Screen>
        <Card>
          <AppText variant="body">완성할 대화가 없어요. AI 대화를 먼저 진행해 주세요.</AppText>
          <Button label="돌아가기" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
        </Card>
      </Screen>
    );
  }

  const textByChoice: Record<VersionChoice, string> = {
    simple: result.simpleVersion,
    natural: result.naturalVersion,
    original: originalText,
    custom: customText,
  };
  const finalText = textByChoice[choice];

  const save = () => {
    const entry = createEntry({
      ownerId: user.id,
      title: title.trim(),
      originalText,
      correctedText: result.naturalVersion,
      finalText,
      translationKo: result.translationKo,
      language,
      emotion,
      inputMethod: 'ai-chat',
      conversationId,
    });
    clear();
    router.replace({ pathname: '/diary/[id]', params: { id: entry.id } });
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <Card soft>
          <AppText variant="bodySmall" color="secondary">
            {result.encouragementKo}
          </AppText>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheading">제목</AppText>
          <TextField placeholder="제목을 입력하세요" value={title} onChangeText={setTitle} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {result.titleCandidates.map((t) => (
              <Button key={t} small variant="ghost" label={t} onPress={() => setTitle(t)} />
            ))}
          </View>
        </View>

        <OptionGroup
          title="어떤 버전으로 저장할까요?"
          options={[
            { value: 'natural', label: '자연스러운 버전' },
            { value: 'simple', label: '쉬운 버전' },
            { value: 'original', label: '내 원문 그대로' },
            { value: 'custom', label: '직접 수정' },
          ]}
          value={choice}
          onChange={setChoice}
        />

        {choice === 'custom' ? (
          <TextField
            value={customText}
            onChangeText={setCustomText}
            multiline
            style={{ minHeight: 140, textAlignVertical: 'top' }}
          />
        ) : (
          <Card>
            <AppText variant="body">{finalText || '(내용 없음)'}</AppText>
          </Card>
        )}

        {result.translationKo ? (
          <Card soft>
            <AppText variant="caption" color="secondary">
              한국어 뜻
            </AppText>
            <AppText variant="bodySmall" color="secondary">
              {result.translationKo}
            </AppText>
          </Card>
        ) : null}

        {result.practiceSentences.length > 0 ? (
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="bodySmall" weight="600">
              🌱 다음에 연습해 볼 문장
            </AppText>
            {result.practiceSentences.map((s) => (
              <AppText key={s} variant="bodySmall" color="secondary">
                · {s}
              </AppText>
            ))}
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheading">오늘의 감정</AppText>
          <EmotionPicker value={emotion} onChange={setEmotion} />
        </View>

        <Button label="일기 저장하기" onPress={save} disabled={!finalText.trim()} />
        <AppText variant="caption" color="secondary" align="center">
          🔒 저장된 일기는 기본으로 비공개예요
        </AppText>
      </View>
    </Screen>
  );
}
