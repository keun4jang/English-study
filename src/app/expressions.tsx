import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SavedExpression } from '@/domain/types';
import { todayKey } from '@/lib/dates';
import { buildQuizQuestion, MASTERY_LABELS, masteryLevel, QuizQuestion } from '@/lib/quiz';
import { speak } from '@/speech/tts';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** 답 확인 중에는 문제/표현을 스냅샷으로 고정한다 (due 재계산으로 다음 문제가 미리 노출되는 것 방지) */
type AnswerState = {
  picked: string;
  correct: boolean;
  target: SavedExpression;
  question: QuizQuestion;
} | null;

/** 숙련 단계 배지 */
function MasteryBadge({ reviewCount }: { reviewCount: number }) {
  const { colors } = useTheme();
  const level = masteryLevel(reviewCount);
  const bg = {
    new: colors.primarySoft,
    learning: colors.warningSoft,
    familiar: colors.successSoft,
  }[level];
  const fg = { new: colors.primaryInk, learning: colors.warning, familiar: colors.success }[level];
  return (
    <View
      accessibilityLabel={`학습 단계: ${MASTERY_LABELS[level]}`}
      style={{
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <AppText variant="caption" weight="600" style={{ color: fg }}>
        {MASTERY_LABELS[level]}
      </AppText>
    </View>
  );
}

/**
 * 단어장 + 퀴즈형 복습.
 * 뜻 맞히기 4지선다 — 다른 저장 표현의 뜻이 오답 보기가 된다.
 * 정답이면 복습 간격이 늘어나고, 틀려도 "내일 다시" 부드럽게 안내한다.
 */
export default function ExpressionsScreen() {
  const { colors } = useTheme();
  const store = useExpressions();
  const speechRate = useSettings((s) => s.voice.speechRate);

  const today = todayKey();
  const due = useMemo(
    () => store.expressions.filter((e) => e.nextReviewDate <= today),
    [store.expressions, today],
  );
  const rest = useMemo(
    () => store.expressions.filter((e) => e.nextReviewDate > today),
    [store.expressions, today],
  );

  // 퀴즈 상태: 오늘 복습할 표현들을 순서대로
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerState>(null);
  const [doneCount, setDoneCount] = useState(0);

  const nextTarget: SavedExpression | undefined = due[Math.min(quizIndex, due.length - 1)];
  const nextQuestion: QuizQuestion | null = useMemo(
    () => (nextTarget ? buildQuizQuestion(nextTarget, store.expressions) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextTarget?.id],
  );
  // 답 확인 중에는 스냅샷을 렌더링한다
  const currentTarget = answer ? answer.target : nextTarget;
  const question = answer ? answer.question : nextQuestion;

  const pick = (choice: string) => {
    if (!nextQuestion || !nextTarget || answer) return;
    const correct = choice === nextQuestion.correctMeaning;
    setAnswer({ picked: choice, correct, target: nextTarget, question: nextQuestion });
    AccessibilityInfo.announceForAccessibility(
      correct ? '맞았어요. 다음 복습 간격이 늘어났어요.' : '괜찮아요. 이 표현은 내일 다시 만나요.',
    );
    if (correct) {
      store.markKnown(nextTarget.id);
    } else {
      store.markAgain(nextTarget.id);
    }
    speak(nextTarget.example || nextTarget.expression, {
      language: nextTarget.language,
      rate: speechRate,
    });
  };

  const next = () => {
    setAnswer(null);
    setDoneCount((c) => c + 1);
    setQuizIndex(0); // due 목록이 갱신되므로 항상 맨 앞
  };

  if (store.expressions.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="book-open"
          title="아직 저장한 표현이 없어요"
          description="AI 대화의 교정 카드에서 '저장'을 누르면 여기에 모여요."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        {(due.length > 0 || answer) && question && currentTarget ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="heading">오늘의 복습</AppText>
              <AppText variant="caption" color="secondary">
                {doneCount}개 완료 · {due.length}개 남음
              </AppText>
            </View>

            <Card variant="raised" style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="subheading" style={{ flex: 1 }}>
                  {question.expression}
                </AppText>
                <MasteryBadge reviewCount={currentTarget.reviewCount} />
              </View>
              <Button
                size="compact"
                variant="ghost"
                icon="volume-2"
                label="발음 듣기"
                onPress={() =>
                  speak(question.expression, { language: currentTarget.language, rate: speechRate })
                }
              />
              <AppText variant="label" color="secondary">
                이 표현의 뜻은 무엇일까요?
              </AppText>
              <View style={{ gap: spacing.sm }}>
                {question.choices.map((choice) => {
                  const isPicked = answer?.picked === choice;
                  const isCorrectChoice = answer && choice === question.correctMeaning;
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityLabel={
                        answer
                          ? `${choice}${
                              choice === question.correctMeaning
                                ? ', 정답'
                                : isPicked
                                  ? ', 내가 고른 답, 오답'
                                  : ''
                            }`
                          : choice
                      }
                      accessibilityState={{
                        selected: Boolean(isPicked),
                        disabled: Boolean(answer),
                      }}
                      disabled={Boolean(answer)}
                      onPress={() => pick(choice)}
                      style={({ pressed }) => ({
                        minHeight: 48,
                        justifyContent: 'center',
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        borderRadius: radius.md,
                        borderWidth: isCorrectChoice || isPicked ? 2 : 1,
                        borderColor: isCorrectChoice
                          ? colors.success
                          : isPicked
                            ? colors.error
                            : colors.border,
                        backgroundColor: isCorrectChoice
                          ? colors.successSoft
                          : isPicked
                            ? colors.errorSoft
                            : pressed
                              ? colors.pressedBackground
                              : colors.surface,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        {isCorrectChoice ? (
                          <AppIcon name="check-circle" size={16} color="success" />
                        ) : isPicked ? (
                          <AppIcon name="x-circle" size={16} color="error" />
                        ) : null}
                        <AppText variant="body" style={{ flex: 1 }}>
                          {choice}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {answer ? (
                <View style={{ gap: spacing.sm }}>
                  <AppText variant="bodySmall" color={answer.correct ? 'success' : 'secondary'}>
                    {answer.correct
                      ? '맞았어요! 다음 복습 간격이 늘어났어요.'
                      : '괜찮아요. 이 표현은 내일 다시 만나요.'}
                  </AppText>
                  {currentTarget.example ? (
                    <AppText variant="caption" color="secondary">
                      예문: {currentTarget.example}
                    </AppText>
                  ) : null}
                  <Button icon="arrow-right" label={due.length > 0 ? '다음 표현' : '복습 끝내기'} onPress={next} />
                </View>
              ) : null}
            </Card>
          </View>
        ) : (
          <Card variant="soft">
            <AppText variant="bodySmall" color="secondary">
              {doneCount > 0
                ? `오늘 ${doneCount}개 표현을 복습했어요.`
                : '지금 복습할 표현이 없어요. 다음 복습일이 되면 여기에 나타나요.'}
            </AppText>
          </Card>
        )}

        <View style={{ gap: spacing.md }}>
          <AppText variant="heading">저장한 표현 ({store.expressions.length})</AppText>
          {rest.map((e) => (
            <Card key={e.id} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="subheading" style={{ flex: 1 }}>
                  {e.expression}
                </AppText>
                <MasteryBadge reviewCount={e.reviewCount} />
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
