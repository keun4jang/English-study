import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { getAIProvider, isMockAI } from '@/ai';
import { ChatBubble } from '@/components/diary/ChatBubble';
import { CorrectionCard } from '@/components/diary/CorrectionCard';
import { SpeakPractice } from '@/components/diary/SpeakPractice';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { CorrectionResult } from '@/domain/types';
import { newId } from '@/lib/id';
import { checkAiTurnAllowed, checkDiaryGenerationAllowed, getUsageLimits } from '@/lib/usageLimits';
import { getSttAdapter } from '@/speech/stt';
import { speak, stopSpeaking } from '@/speech/tts';
import { useAuth } from '@/state/useAuth';
import { useChat } from '@/state/useChat';
import { useExpressions } from '@/state/useExpressions';
import { useFinalize } from '@/state/useFinalize';
import { useSettings } from '@/state/useSettings';
import { useUsage } from '@/state/useUsage';
import { spacing } from '@/theme/tokens';

export default function ChatScreen() {
  const user = useAuth((s) => s.user);
  const learning = useSettings((s) => s.learning);
  const voice = useSettings((s) => s.voice);
  const showTranslation = useSettings((s) => s.diary.showKoreanTranslation);
  const chat = useChat();
  const usage = useUsage();
  const expressions = useExpressions();
  const finalize = useFinalize();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pendingCorrection, setPendingCorrection] = useState<{
    correction: CorrectionResult;
    userMessageId: string;
  } | null>(null);
  const [practiceTarget, setPracticeTarget] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sttSupported = getSttAdapter().isSupported();

  const allMessages = useChat((s) => s.messages);
  const messages = useMemo(
    () => (conversationId ? allMessages.filter((m) => m.conversationId === conversationId) : []),
    [allMessages, conversationId],
  );

  // 대화 시작 + 첫 인사 (렌더 이후 비동기로 생성)
  useEffect(() => {
    if (!user || conversationId) return;
    const timer = setTimeout(() => {
      const conversation = chat.startConversation(user.id, learning.language);
      setConversationId(conversation.id);
      const greeting =
        learning.language === 'en'
          ? 'Hi! How was your day today? 😊'
          : 'こんにちは！今日はどんな一日でしたか？😊';
      chat.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        text: greeting,
        translationKo: '안녕하세요! 오늘 하루 어땠어요?',
      });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const savedExpressionSet = useMemo(
    () => new Set(expressions.expressions.map((e) => e.expression)),
    [expressions.expressions],
  );

  const limits = getUsageLimits();
  const todayUsage = usage.getToday();
  const turnsLeft = Math.max(0, limits.dailyAiTurns - todayUsage.aiTurns);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sending) return;

    const allowed = checkAiTurnAllowed(usage.getToday(), trimmed);
    if (!allowed.allowed) {
      if (allowed.reason === 'input-too-long') {
        setLimitMessage(`한 번에 ${limits.maxInputChars.toLocaleString()}자까지 보낼 수 있어요. 나눠서 보내볼까요?`);
      } else {
        setLimitMessage(
          '오늘의 AI 대화 횟수를 모두 사용했어요. 내일 다시 만나요! 지금은 "직접 일기 쓰기"로 이어서 기록할 수 있어요.',
        );
      }
      return;
    }
    setLimitMessage(null);
    setSending(true);
    setInput('');
    setPendingCorrection(null);

    const userMessage = chat.addMessage({
      conversationId,
      role: 'user',
      text: trimmed,
    });

    try {
      const provider = getAIProvider();
      const recentMessages = [...messages, userMessage]
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));
      const response = await provider.evaluateAndReply(trimmed, {
        language: learning.language,
        level: learning.level,
        intensity: learning.correctionIntensity,
        recentMessages,
        conversationSummary: null,
        requestId: newId(),
      });
      usage.recordAiTurn();

      const { correction } = response;
      chat.addMessage({
        conversationId,
        role: 'assistant',
        text: response.assistant.replyTargetLanguage,
        translationKo: response.assistant.replyKo,
        correction: correction.severity === 'correct' ? null : correction,
      });

      // 교정 타이밍 설정에 따라 카드 표시 여부 결정
      const showCard =
        correction.severity === 'major'
          ? learning.correctionTiming !== 'after-conversation'
          : correction.severity === 'minor'
            ? learning.correctionTiming === 'every-turn'
            : false;
      if (showCard) {
        setPendingCorrection({ correction, userMessageId: userMessage.id });
      }

      if (voice.autoPlayAiReply) {
        speak(response.assistant.replyTargetLanguage, {
          language: learning.language,
          rate: voice.speechRate,
        });
      }
    } catch {
      chat.addMessage({
        conversationId,
        role: 'assistant',
        text:
          learning.language === 'en'
            ? "Sorry, I couldn't respond just now. Let's keep going!"
            : 'すみません、うまく答えられませんでした。続けましょう！',
        translationKo: '잠시 응답하지 못했어요. 계속 이야기해 주세요! (내용은 안전하게 저장돼요)',
      });
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const startVoiceInput = () => {
    setListening(true);
    getSttAdapter().start(learning.language, {
      onResult: (result) => {
        setInput(result.text);
        if (result.isFinal) {
          setListening(false);
        }
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
  };

  const finishAndCreateDiary = async () => {
    if (!conversationId || finishing) return;
    const userSentences = messages.filter((m) => m.role === 'user');
    if (userSentences.length === 0) {
      setLimitMessage('아직 이야기를 시작하지 않았어요. 한 문장이라도 나눠 볼까요?');
      return;
    }
    const allowed = checkDiaryGenerationAllowed(usage.getToday());
    if (!allowed.allowed) {
      setLimitMessage(
        '오늘의 AI 일기 완성 횟수를 모두 사용했어요. "직접 일기 쓰기"에서 대화 내용을 정리해 저장할 수 있어요.',
      );
      return;
    }
    setFinishing(true);
    try {
      const provider = getAIProvider();
      const result = await provider.createFinalDiary({
        language: learning.language,
        level: learning.level,
        messages: messages.map((m) => ({ role: m.role, text: m.text })),
        requestId: newId(),
      });
      usage.recordDiaryGeneration();
      chat.finishConversation(conversationId);
      finalize.setResult({
        result,
        conversationId,
        language: learning.language,
        originalText: userSentences.map((m) => m.text).join(' '),
      });
      router.push('/write/finalize');
    } catch {
      setLimitMessage('일기 생성에 실패했어요. 잠시 후 다시 시도하거나, 직접 쓰기로 저장해 주세요.');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ flex: 1 }}>
        {isMockAI() ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            <AppText variant="caption" color="secondary">
              🧪 Mock AI 모드 · 오늘 남은 대화 {turnsLeft}턴
            </AppText>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            <AppText variant="caption" color="secondary">
              오늘 남은 대화 {turnsLeft}턴
            </AppText>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              language={learning.language}
              speechRate={voice.speechRate}
              showTranslation={showTranslation}
            />
          ))}

          {pendingCorrection ? (
            <CorrectionCard
              correction={pendingCorrection.correction}
              language={learning.language}
              savedExpressions={savedExpressionSet}
              onSpeakAgain={() => setPracticeTarget(pendingCorrection.correction.corrected)}
              onKeepOriginal={() => setPendingCorrection(null)}
              onApplyCorrection={() => setPendingCorrection(null)}
              onContinue={() => setPendingCorrection(null)}
              onSaveExpression={(k) => {
                if (!user) return;
                expressions.saveExpression({
                  ownerId: user.id,
                  expression: k.expression,
                  meaningKo: k.meaningKo,
                  example: k.example,
                  language: learning.language,
                });
              }}
            />
          ) : null}

          {sending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator />
              <AppText variant="caption" color="secondary">
                AI 친구가 생각하고 있어요…
              </AppText>
            </View>
          ) : null}

          {limitMessage ? (
            <Card soft>
              <AppText variant="bodySmall" color="secondary">
                {limitMessage}
              </AppText>
            </Card>
          ) : null}
        </ScrollView>

        <View
          style={{
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField
                placeholder={
                  listening
                    ? '🎙️ 듣고 있어요…'
                    : learning.language === 'en'
                      ? '오늘 있었던 일을 영어로 말해보세요'
                      : '今日のことを日本語で書いてみましょう'
                }
                value={input}
                onChangeText={setInput}
                multiline
                autoCapitalize="none"
                editable={!sending}
              />
            </View>
            {sttSupported ? (
              <Button
                small
                variant={listening ? 'primary' : 'secondary'}
                label={listening ? '⏹' : '🎙️'}
                onPress={listening ? () => getSttAdapter().stop() : startVoiceInput}
                accessibilityHint="음성으로 입력하기"
              />
            ) : null}
            <Button small label="보내기" onPress={() => send(input)} disabled={!input.trim() || sending} />
          </View>
          <Button
            variant="secondary"
            label={finishing ? '일기를 만들고 있어요…' : '💌 대화 마치고 일기 만들기'}
            loading={finishing}
            onPress={finishAndCreateDiary}
          />
        </View>
      </View>

      <SpeakPractice
        visible={practiceTarget !== null}
        targetSentence={practiceTarget ?? ''}
        language={learning.language}
        speechRate={voice.speechRate}
        onSuccess={() => {
          setPracticeTarget(null);
          setPendingCorrection(null);
        }}
        onSkip={() => {
          setPracticeTarget(null);
          setPendingCorrection(null);
        }}
        onClose={() => setPracticeTarget(null)}
      />
    </Screen>
  );
}
