import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptionGroup } from '@/components/ui/OptionGroup';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { appConfig } from '@/config/appConfig';
import {
  CorrectionIntensity,
  CorrectionTiming,
  LearningGoal,
  LearningLanguage,
  SpeechRate,
  UserLevel,
} from '@/domain/types';
import { useAuth } from '@/state/useAuth';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

const STEPS = ['환영', '프로필', '학습 설정', '교정 방식'] as const;

export default function Onboarding() {
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const updateVoice = useSettings((s) => s.updateVoice);
  const signInDemo = useAuth((s) => s.signInDemo);

  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [language, setLanguage] = useState<LearningLanguage>('en');
  const [level, setLevel] = useState<UserLevel>('beginner');
  const [goal, setGoal] = useState<LearningGoal>('daily');
  const [intensity, setIntensity] = useState<CorrectionIntensity>('balanced');
  const [timing, setTiming] = useState<CorrectionTiming>('every-turn');
  const [speechRate, setSpeechRate] = useState<SpeechRate>('normal');

  const finish = () => {
    completeOnboarding({
      language,
      level,
      goal,
      correctionIntensity: intensity,
      correctionTiming: timing,
    });
    updateVoice({ speechRate });
    if (nickname.trim()) {
      signInDemo(nickname);
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxl }}>
        <AppText variant="caption" color="secondary">
          {step + 1} / {STEPS.length} · {STEPS[step]}
        </AppText>

        {step === 0 ? (
          <View style={{ gap: spacing.lg, alignItems: 'center', paddingVertical: spacing.xxl }}>
            <AppIcon name="book-open" size={48} color="accent" />
            <AppText variant="title" align="center">
              {appConfig.appName}
            </AppText>
            <AppText variant="body" color="secondary" align="center">
              오늘 있었던 일을 배우고 싶은 언어로 이야기하면,{'\n'}AI 친구가 함께 대화하며{'\n'}
              하나의 예쁜 일기로 완성해 드려요.
            </AppText>
            <Button label="시작하기" onPress={() => setStep(1)} />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: spacing.xl }}>
            <TextField
              label="닉네임"
              placeholder="어떻게 불러드릴까요?"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
            <OptionGroup
              title="배우고 싶은 언어"
              options={[
                { value: 'en', label: '영어', description: '기본 학습 언어예요. 나중에 변경할 수 있어요.' },
                { value: 'ja', label: '일본어' },
              ]}
              value={language}
              onChange={setLanguage}
            />
            <AppText variant="caption" color="secondary">
              모국어(설명 언어)는 한국어로 설정돼요. 모든 항목은 나중에 설정에서 변경할 수 있어요.
            </AppText>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: spacing.xl }}>
            <OptionGroup
              title="지금 실력은 어느 정도인가요?"
              options={[
                { value: 'beginner-zero', label: '처음 시작' },
                { value: 'beginner', label: '초급' },
                { value: 'intermediate', label: '중급' },
                { value: 'advanced', label: '고급' },
              ]}
              value={level}
              onChange={setLevel}
            />
            <OptionGroup
              title="어떤 목적으로 배우세요?"
              options={[
                { value: 'daily', label: '일상회화' },
                { value: 'travel', label: '여행' },
                { value: 'work', label: '업무' },
                { value: 'study-abroad', label: '유학' },
                { value: 'hobby', label: '취미' },
              ]}
              value={goal}
              onChange={setGoal}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: spacing.xl }}>
            <OptionGroup
              title="AI 교정 강도"
              options={[
                { value: 'gentle', label: '부드럽게', description: '중요한 오류만 알려드려요.' },
                { value: 'balanced', label: '보통', description: '자연스러움과 문법을 균형 있게 봐드려요.' },
                { value: 'thorough', label: '꼼꼼하게', description: '작은 오류까지 알려드려요.' },
              ]}
              value={intensity}
              onChange={setIntensity}
            />
            <OptionGroup
              title="교정 타이밍"
              options={[
                { value: 'every-turn', label: '말할 때마다' },
                { value: 'major-only', label: '중요한 오류만' },
                { value: 'after-conversation', label: '대화 끝난 후' },
              ]}
              value={timing}
              onChange={setTiming}
            />
            <OptionGroup
              title="AI 말하기 속도"
              options={[
                { value: 'slow', label: '느리게' },
                { value: 'normal', label: '보통' },
                { value: 'fast', label: '빠르게' },
              ]}
              value={speechRate}
              onChange={setSpeechRate}
            />
            <Card soft>
              <AppText variant="caption" color="secondary">
                일기는 기본으로 비공개예요. 음성 원본은 저장하지 않아요. 모든 설정은 나중에
                바꿀 수 있어요.
              </AppText>
            </Card>
          </View>
        ) : null}

        {step > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button variant="ghost" label="이전" onPress={() => setStep((s) => s - 1)} />
            {step < STEPS.length - 1 ? (
              <Button label="다음" onPress={() => setStep((s) => s + 1)} />
            ) : (
              <Button label="완료" onPress={finish} />
            )}
          </View>
        ) : null}
      </View>
      <VersionFooter />
    </Screen>
  );
}
