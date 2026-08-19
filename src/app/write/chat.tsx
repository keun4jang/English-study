import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { getAIProvider, isBuiltInAI } from '@/ai';
import { KoHelp, helpFromKorean, isKoreanInput } from '@/ai/korean';
import { ChatBubble } from '@/components/diary/ChatBubble';
import { CorrectionCard } from '@/components/diary/CorrectionCard';
import { KoreanHelpCard } from '@/components/diary/KoreanHelpCard';
import { SentenceBuilderSheet } from '@/components/diary/SentenceBuilderSheet';
import { SpeakPractice } from '@/components/diary/SpeakPractice';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExitConfirmDialog } from '@/components/ui/ExitConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { InkLoading } from '@/components/ui/InkLoading';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { CorrectionResult } from '@/domain/types';
import { todayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { checkAiTurnAllowed, checkDiaryGenerationAllowed, getUsageLimits } from '@/lib/usageLimits';
import { useUnsavedExit } from '@/lib/useUnsavedExit';
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
  /** 한글로 썼을 때 띄우는 예시 카드 */
  const [koreanHelp, setKoreanHelp] = useState<KoHelp | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sttSupported = getSttAdapter().isSupported();

  const allMessages = useChat((s) => s.messages);
  const messages = useMemo(
    () => (conversationId ? allMessages.filter((m) => m.conversationId === conversationId) : []),
    [allMessages, conversationId],
  );

  // 대화 시작: 진행 중인 대화가 있으면 이어서(어제 것 포함 — "보관" 약속 준수), 없으면 새로 시작
  useEffect(() => {
    if (!user || conversationId) return;
    const timer = setTimeout(() => {
      // 사용자 발화가 없는 빈 대화(인사만 남은 것)는 정리해 누적을 막는다
      chat.pruneEmptyConversations();
      const resumable = useChat
        .getState()
        .conversations.find(
          (c) =>
            c.status === 'active' &&
            useChat.getState().messages.some((m) => m.conversationId === c.id && m.role === 'user'),
        );
      if (resumable) {
        // 뒤로 나갔다 돌아와도(자정이 지나도) 대화가 사라지지 않고 이어진다
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
  // 화면 안 뒤로가기 · 안드로이드 뒤로가기 · 브라우저 뒤로가기를 한 곳에서 받는다
  const exit = useUnsavedExit(hasUnsaved);

  const savedExpressionSet = useMemo(
    () => new Set(expressions.expressions.map((e) => e.expression)),
    [expressions.expressions],
  );

  // 재개된 대화는 그 대화의 언어를 따른다 (설정 언어와 달라도 일관되게)
  const chatLanguage = conversation?.language ?? learning.language;

  const limits = getUsageLimits();
  // 렌더 중 스토어 변경 방지: 표시용은 읽기만 (실제 차감/리셋은 이벤트 핸들러의 getToday)
  const storedUsage = useUsage((s) => s.usage);
  const todayUsage =
    storedUsage.date === todayKey() ? storedUsage : { ...storedUsage, aiTurns: 0, diaryGenerations: 0 };
  const turnsLeft = Math.max(0, limits.dailyAiTurns - todayUsage.aiTurns);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sending) return;

    // 한글로 썼다면 보내지 않고 예시를 보여 준다.
    //
    // 보내 버리면 세 가지가 한꺼번에 잘못된다: 한국어 문장이 "잘 썼어요"로 교정되고,
    // AI 대화 횟수가 깎이고, 무엇보다 그 한국어가 그대로 영어 일기에 저장된다.
    // 입력창의 글은 지우지 않는다 — 사라지면 다시 써야 한다.
    if (isKoreanInput(trimmed)) {
      setKoreanHelp(helpFromKorean(trimmed, chatLanguage));
      setLimitMessage(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }
    setKoreanHelp(null);

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
        language: chatLanguage,
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
          language: chatLanguage,
          rate: voice.speechRate,
        });
      }
    } catch {
      chat.addMessage({
        conversationId,
        role: 'assistant',
        text:
          chatLanguage === 'en'
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
    getSttAdapter().start(chatLanguage, {
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
        language: chatLanguage,
        level: learning.level,
        messages: messagesWithCorrections,
        requestId: newId(),
      });
      usage.recordDiaryGeneration();
      // 대화는 여기서 잠그지 않는다 — 저장 완료 시(finalize) finished 처리.
      // 저장 없이 돌아오면 대화를 이어가거나 다시 완성할 수 있다.
      finalize.setResult({
        result,
        conversationId,
        language: chatLanguage,
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
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <AppText variant="caption" color="secondary">
            {isBuiltInAI() ? '내장 AI · ' : ''}오늘 남은 대화 {turnsLeft}턴
          </AppText>
        </View>

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
              language={chatLanguage}
              speechRate={voice.speechRate}
              showTranslation={showTranslation}
            />
          ))}

          {pendingCorrection ? (
            <CorrectionCard
              correction={pendingCorrection.correction}
              language={chatLanguage}
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
                  language: chatLanguage,
                });
              }}
            />
          ) : null}

          {sending ? (
            <InkLoading
              message="이야기를 잘 듣고 있어요"
              slowMessage="더 자연스러운 표현을 생각하고 있어요"
            />
          ) : null}
          {finishing ? (
            <InkLoading message="오늘의 이야기를 한 장에 담고 있어요" />
          ) : null}

          {koreanHelp ? (
            <KoreanHelpCard
              help={koreanHelp}
              language={chatLanguage}
              onUse={(text) => {
                setInput(text);
                setKoreanHelp(null);
              }}
              onSpeak={(text) => speak(text, { language: chatLanguage, rate: voice.speechRate })}
              onOpenBuilder={() => setBuilderOpen(true)}
              onDismiss={() => setKoreanHelp(null)}
            />
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
                    ? '듣고 있어요…'
                    : chatLanguage === 'en'
                      ? // 한국어로 써도 된다는 걸 여기서 알려준다. 모르면 첫 문장에서 막히고,
                        // 막히면 앱을 닫는다.
                        '영어로 말해보세요 — 한국어로 써도 괜찮아요'
                      : '日本語で書いてみましょう — 韓国語でも大丈夫'
                }
                value={input}
                onChangeText={setInput}
                multiline
                autoCapitalize="none"
                editable={!sending}
                style={{ maxHeight: 120 }}
              />
            </View>
            {sttSupported ? (
              <IconButton
                icon={listening ? 'square' : 'mic'}
                variant={listening ? 'primary' : 'secondary'}
                accessibilityLabel={listening ? '음성 입력 중지' : '음성으로 입력하기'}
                onPress={listening ? () => getSttAdapter().stop() : startVoiceInput}
              />
            ) : null}
            <IconButton
              icon="send"
              variant="primary"
              accessibilityLabel="메시지 보내기"
              onPress={() => send(input)}
              disabled={!input.trim() || sending}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              size="compact"
              variant="ghost"
              icon="help-circle"
              label={
                input.trim() && isKoreanInput(input)
                  ? `${chatLanguage === 'en' ? '영어' : '일본어'}로 어떻게 말해요?`
                  : '문장 만들기'
              }
              onPress={() => {
                const trimmed = input.trim();
                // 한글을 써 둔 상태면 그 문장으로 예시를 만들고, 빈 상태면 바로 골라서 만든다
                if (trimmed && isKoreanInput(trimmed)) setKoreanHelp(helpFromKorean(trimmed, chatLanguage));
                else setBuilderOpen(true);
              }}
            />
          </View>
          <Button
            variant="secondary"
            icon="mail"
            label={finishing ? '일기를 만들고 있어요…' : '대화 마치고 일기 만들기'}
            loading={finishing}
            onPress={finishAndCreateDiary}
          />
          {finalize.result && finalize.conversationId === conversationId ? (
            <Button
              size="compact"
              variant="ghost"
              icon="file-text"
              label="만들어 둔 일기 완성 화면으로 돌아가기"
              onPress={() => router.push('/write/finalize')}
            />
          ) : null}
        </View>
      </View>

      <SentenceBuilderSheet
        visible={builderOpen}
        language={chatLanguage}
        onClose={() => setBuilderOpen(false)}
        onUse={(text) => {
          setInput(text);
          setKoreanHelp(null);
        }}
        onSpeak={(text) => speak(text, { language: chatLanguage, rate: voice.speechRate })}
      />

      <SpeakPractice
        visible={practiceTarget !== null}
        targetSentence={practiceTarget ?? ''}
        language={chatLanguage}
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

      <ExitConfirmDialog
        visible={exit.pending}
        title="대화를 마칠까요?"
        description="지금까지의 대화로 일기를 만들 수 있어요. 저장하지 않고 나가도 대화는 사라지지 않고, 홈에서 이어서 이야기할 수 있어요."
        saveLabel="일기 만들고 저장하기"
        onSave={() => {
          exit.cancel();
          finishAndCreateDiary();
        }}
        discardLabel="저장 안 하고 나가기"
        onDiscard={exit.confirm}
        onCancel={exit.cancel}
      />
    </Screen>
  );
}
