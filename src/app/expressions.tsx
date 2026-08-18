import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { todayKey } from '@/lib/dates';
import { speak } from '@/speech/tts';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

/** 단어장 + 간단한 간격 반복 복습 */
export default function ExpressionsScreen() {
  const store = useExpressions();
  const speechRate = useSettings((s) => s.voice.speechRate);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const today = todayKey();
  const due = useMemo(
    () => store.expressions.filter((e) => e.nextReviewDate <= today),
    [store.expressions, today],
  );
  const rest = useMemo(
    () => store.expressions.filter((e) => e.nextReviewDate > today),
    [store.expressions, today],
  );

  if (store.expressions.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="book-open"
          title="아직 저장한 표현이 없어요"
          description="AI 대화의 교정 카드에서 '단어장 저장'을 누르면 여기에 모여요."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        {due.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <AppText variant="heading">오늘의 복습 ({due.length})</AppText>
            {due.map((e) => {
              const revealed = revealedId === e.id;
              return (
                <Card key={e.id} soft style={{ gap: spacing.sm }}>
                  <AppText variant="subheading">{e.expression}</AppText>
                  {revealed ? (
                    <>
                      <AppText variant="bodySmall" color="secondary">
                        {e.meaningKo}
                      </AppText>
                      {e.example ? (
                        <AppText variant="bodySmall" color="secondary">
                          예문: {e.example}
                        </AppText>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                        <Button
                          small
                          variant="secondary"
                          icon="volume-2"
                          label="예문 듣기"
                          onPress={() =>
                            speak(e.example || e.expression, { language: e.language, rate: speechRate })
                          }
                        />
                        <Button
                          small
                          icon="check"
                          label="알아요"
                          onPress={() => {
                            store.markKnown(e.id);
                            setRevealedId(null);
                          }}
                        />
                        <Button
                          small
                          variant="ghost"
                          label="다시 볼래요"
                          onPress={() => {
                            store.markAgain(e.id);
                            setRevealedId(null);
                          }}
                        />
                      </View>
                    </>
                  ) : (
                    <Button small variant="secondary" label="뜻 보기" onPress={() => setRevealedId(e.id)} />
                  )}
                </Card>
              );
            })}
          </View>
        ) : (
          <Card soft>
            <AppText variant="bodySmall" color="secondary">
              오늘 복습할 표현을 모두 봤어요.
            </AppText>
          </Card>
        )}

        <View style={{ gap: spacing.md }}>
          <AppText variant="heading">저장한 표현 ({store.expressions.length})</AppText>
          {rest.map((e) => (
            <Card key={e.id} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="subheading" style={{ flex: 1 }}>
                  {e.expression}
                </AppText>
                <Button
                  small
                  variant="ghost"
                  icon={e.isFavorite ? 'check' : 'bookmark'}
                  label={e.isFavorite ? '보관됨' : '보관'}
                  onPress={() => store.toggleFavorite(e.id)}
                />
              </View>
              <AppText variant="bodySmall" color="secondary">
                {e.meaningKo}
              </AppText>
              <AppText variant="caption" color="secondary">
                다음 복습: {e.nextReviewDate} · 복습 {e.reviewCount}회
              </AppText>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}
