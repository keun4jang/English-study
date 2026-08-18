import { router, useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, View } from 'react-native';

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
import { todayKey } from '@/lib/dates';
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
import { useTheme } from '@/theme/useTheme';

export default function ChatScreen() {
  const { colors } = useTheme();
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
  const [exitAction, setExitAction] = useState<object | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  const sttSupported = getSttAdapter().isSupported();

  const allMessages = useChat((s) => s.messages);
  const messages = useMemo(
    () => (conversationId ? allMessages.filter((m) => m.conversationId === conversationId) : []),
    [allMessages, conversationId],
  );

  // 대화 시작: 오늘 진행 중인 대화가 있으면 이어서, 없으면 새로 시작 + 첫 인사
  useEffect(() => {
    if (!user || conversationId) return;
    const timer = setTimeout(() => {
      const state = useChat.getState();
      const today = todayKey();
      const resumable = state.conversations.find(
        (c) =>
          c.status === 'active' &&
          c.localDate === today &&
          c.language === learning.language &&
          state.messages.some((m) => m.conversationId === c.id),
      );
      if (resumable) {
        // 뒤로 나갔다 돌아와도 대화가 사라지지 않고 이어진다
        setConversationId(resumable.id);
        return;
      }
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

  // 뒤로가기 확인: 대화 중(사용자 메시지 있음 + 일기 미완성)에는 바로 나가지 않고 팝업으로 묻는다.
  const conversation = useChat((s) => s.conversations.find((c) => c.id === conversationId));
  const hasUnsaved =
    conversation?.status === 'active' && messages.some((m) => m.role === 'user') && !finishing;
  const hasUnsavedRef = useRef(false);
  useEffect(() => {
    hasUnsavedRef.current = hasUnsaved;
  }, [hasUnsaved]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedRef.current) return;
      e.preventDefault();
      setExitAction(e.data.action);
    });
    return unsubscribe;
  }, [navigation]);

  const confirmExit = () => {
    const action = exitAction;
    setExitAction(null);
    hasUnsavedRef.current = false; // 이번 나가기는 통과 (대화는 보관되어 이어서 할 수 있음)
    if (action) {
      // @ts-expect-error react-navigation action 타입은 라우터 내부 타입과 호환됨
      navigation.dispatch(action);
    } else {
      router.back();
    }
  };

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
      // 각 사용자 발화에 대한 교정문을 찾아 함께 전달 (최종 일기에 교정 반영)
      const messagesWithCorrections = messages.map((m, i) => {
        let correctedText: string | null = null;
        if (m.role === 'user') {
          const next = messages[i + 1];
          if (
            next?.role === 'assistant' &&
            next.correction &&
            next.correction.original === m.text &&
            next.correction.corrected !== m.text
          ) {
            correctedText = next.correction.corrected;
          }
        }
        return { role: m.role, text: m.text, correctedText };
      });
      const result = await provider.createFinalDiary({
        language: learning.language,
        level: learning.level,
        messages: messagesWithCorrections,
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
              onApplyCorrection={() => {
                // 내 메시지를 교정문으로 실제 교체
                chat.updateMessageText(
                  pendingCorrection.userMessageId,
                  pendingCorrection.correction.corrected,
                );
                setPendingCorrection(null);
              }}
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
          // 다시 말하기 성공 → 교정문을 내 메시지에 반영
          if (pendingCorrection) {
            chat.updateMessageText(
              pendingCorrection.userMessageId,
              pendingCorrection.correction.corrected,
            );
          }
          setPracticeTarget(null);
          setPendingCorrection(null);
        }}
        onSkip={() => {
          setPracticeTarget(null);
          setPendingCorrection(null);
        }}
        onClose={() => setPracticeTarget(null)}
      />

      {/* 나가기 확인 팝업 */}
      <Modal
        visible={exitAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExitAction(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <Card style={{ gap: spacing.md }}>
            <AppText variant="subheading">대화를 마칠까요?</AppText>
            <AppText variant="bodySmall" color="secondary">
              지금까지의 대화로 일기를 만들 수 있어요. 그냥 나가도 대화는 사라지지 않고,
              오늘 홈에서 이어서 이야기할 수 있어요.
            </AppText>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="💌 일기 만들고 저장하기"
                onPress={() => {
                  setExitAction(null);
                  finishAndCreateDiary();
                }}
              />
              <Button variant="secondary" label="나가기 (대화는 보관돼요)" onPress={confirmExit} />
              <Button variant="ghost" label="계속 이야기하기" onPress={() => setExitAction(null)} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
