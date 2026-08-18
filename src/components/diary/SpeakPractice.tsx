import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, View } from 'react-native';

import { LearningLanguage, SpeechRate } from '@/domain/types';
import { matchSpokenSentence } from '@/lib/textSimilarity';
import { getSttAdapter, SttErrorCode } from '@/speech/stt';
import { speak, stopSpeaking } from '@/speech/tts';
import { useSettings } from '@/state/useSettings';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

interface SpeakPracticeProps {
  visible: boolean;
  targetSentence: string;
  language: LearningLanguage;
  speechRate: SpeechRate;
  onSuccess: (recognizedText: string, score: number) => void;
  onSkip: () => void;
  onClose: () => void;
}

type Phase = 'idle' | 'listening' | 'success' | 'retry';

const STT_ERROR_MESSAGES: Record<SttErrorCode, string> = {
  'not-supported': '이 기기에서는 음성 인식을 사용할 수 없어요. 아래에 직접 입력해 볼까요?',
  'permission-denied': '마이크 사용 권한이 필요해요. 설정에서 허용한 뒤 다시 시도해 주세요.',
  network: '네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
  'no-speech': '목소리가 들리지 않았어요. 한 번만 더 말해볼까요?',
  'too-short': '조금 더 길게 말해볼까요?',
  aborted: '',
  unknown: '음성 인식이 잘 안 됐어요. 다시 시도하거나 직접 입력해 주세요.',
};

/**
 * "교정 문장 다시 말하기" 연습 모달.
 * - STT 지원: 마이크로 말하고 목표 문장과 비교
 * - STT 미지원: 텍스트 입력 fallback
 * - 점수는 "목표 문장 일치도"(참고용)이며 발음 점수가 아니다.
 */
export function SpeakPractice({
  visible,
  targetSentence,
  language,
  speechRate,
  onSuccess,
  onSkip,
  onClose,
}: SpeakPracticeProps) {
  const { colors } = useTheme();
  const threshold = useSettings((s) => s.learning.similarityThreshold);
  const maxRetries = useSettings((s) => s.learning.maxRetryCount);
  const hapticsEnabled = useSettings((s) => s.design.hapticsEnabled);

  const [phase, setPhase] = useState<Phase>('idle');
  const [interimText, setInterimText] = useState('');
  const [recognized, setRecognized] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const sttSupported = getSttAdapter().isSupported();

  useEffect(() => {
    if (!visible) {
      getSttAdapter().abort();
      stopSpeaking();
      // 다음 열림을 위해 상태 초기화 (렌더 이후 비동기 수행)
      const timer = setTimeout(() => {
        setPhase('idle');
        setInterimText('');
        setRecognized('');
        setScore(null);
        setAttempts(0);
        setErrorMsg(null);
        setManualText('');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const evaluate = (spokenText: string) => {
    const result = matchSpokenSentence(targetSentence, spokenText, language, threshold);
    setRecognized(spokenText);
    setScore(result.score);
    setAttempts((a) => a + 1);
    if (result.passed) {
      setPhase('success');
      if (hapticsEnabled && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } else {
      setPhase('retry');
    }
  };

  const startListening = () => {
    setErrorMsg(null);
    setInterimText('');
    setPhase('listening');
    getSttAdapter().start(language, {
      onResult: (result) => {
        setInterimText(result.text);
        if (result.isFinal) {
          if (result.text.trim().length < 2) {
            setErrorMsg(STT_ERROR_MESSAGES['too-short']);
            setPhase('idle');
          } else {
            evaluate(result.text);
          }
        }
      },
      onError: (code) => {
        if (code !== 'aborted') setErrorMsg(STT_ERROR_MESSAGES[code]);
        setPhase('idle');
      },
      onEnd: () => {
        setPhase((p) => (p === 'listening' ? 'idle' : p));
      },
    });
  };

  const scorePercent = score === null ? null : Math.round(score * 100);
  const retriesLeft = maxRetries - attempts;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Card style={{ gap: spacing.md, borderRadius: radius.xl }}>
          <AppText variant="subheading">이 문장을 따라 말해볼까요?</AppText>
          <AppText variant="body" weight="600" style={{ color: colors.primary }}>
            {targetSentence}
          </AppText>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              small
              variant="secondary"
              label="🔊 듣기"
              onPress={() => speak(targetSentence, { language, rate: speechRate })}
            />
            <Button
              small
              variant="secondary"
              label="🐢 천천히 듣기"
              onPress={() => speak(targetSentence, { language, extraSlow: true })}
            />
          </View>

          {phase === 'listening' ? (
            <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.md }}>
              <AppText variant="heading" accessibilityLabel="음성 인식 중">
                🎙️
              </AppText>
              <AppText variant="bodySmall" color="secondary">
                듣고 있어요… 말이 끝나면 잠시 기다려 주세요
              </AppText>
              {interimText ? (
                <AppText variant="bodySmall" align="center">
                  “{interimText}”
                </AppText>
              ) : null}
              <Button small variant="ghost" label="중지" onPress={() => getSttAdapter().stop()} />
            </View>
          ) : null}

          {phase === 'success' ? (
            <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.md }}>
              <AppText variant="heading">🎉 성공!</AppText>
              <AppText variant="bodySmall" color="secondary" align="center">
                인식된 문장: “{recognized}”
              </AppText>
              {scorePercent !== null ? (
                <AppText variant="caption" color="secondary">
                  목표 문장 일치도 {scorePercent}% (참고용 지표예요)
                </AppText>
              ) : null}
              <Button label="계속하기" onPress={() => onSuccess(recognized, score ?? 0)} />
            </View>
          ) : null}

          {phase === 'retry' ? (
            <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.md }}>
              <AppText variant="body" align="center">
                거의 다 왔어요! 한 번만 더 천천히 말해볼까요? 🌱
              </AppText>
              <AppText variant="bodySmall" color="secondary" align="center">
                인식된 문장: “{recognized}”
              </AppText>
              {scorePercent !== null ? (
                <AppText variant="caption" color="secondary">
                  목표 문장 일치도 {scorePercent}% (참고용 지표예요)
                </AppText>
              ) : null}
              {retriesLeft > 0 && sttSupported ? (
                <Button label={`다시 말하기 (${retriesLeft}번 남음)`} onPress={startListening} />
              ) : null}
            </View>
          ) : null}

          {phase === 'idle' ? (
            <View style={{ gap: spacing.md }}>
              {errorMsg ? (
                <AppText variant="bodySmall" color="secondary">
                  {errorMsg}
                </AppText>
              ) : null}
              {sttSupported ? (
                <Button label="🎙️ 말하기 시작" onPress={startListening} />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <AppText variant="bodySmall" color="secondary">
                    이 환경에서는 음성 인식이 지원되지 않아요. 문장을 소리 내어 읽은 뒤, 직접
                    입력해서 확인해 볼 수 있어요. (Web 브라우저에서는 마이크 사용 가능)
                  </AppText>
                  <TextField
                    placeholder="말한 문장을 입력해 보세요"
                    value={manualText}
                    onChangeText={setManualText}
                    autoCapitalize="none"
                  />
                  <Button
                    label="확인하기"
                    disabled={manualText.trim().length < 2}
                    onPress={() => evaluate(manualText)}
                  />
                </View>
              )}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button small variant="ghost" label="건너뛰기" onPress={onSkip} />
            <Button small variant="ghost" label="닫기" onPress={onClose} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
