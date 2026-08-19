import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface InkLoadingProps {
  message: string;
  /** 3초 이상 걸릴 때 바꿔 보여줄 문구 */
  slowMessage?: string;
}

/**
 * AI 응답 로딩 — 점 3개 대신 3개의 짧은 세로 잉크 획이 순차적으로 변하는 로딩.
 * 전체 주기 약 900ms. Reduce Motion이면 정적인 잉크 획만 표시.
 */
export function InkLoading({ message, slowMessage }: InkLoadingProps) {
  const { colors } = useTheme();
  const [values] = useState(() => [new Animated.Value(0.4), new Animated.Value(0.4), new Animated.Value(0.4)]);
  const [text, setText] = useState(message);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (mounted && reduce) setAnimate(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!animate) return;
    const animations = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [animate, values]);

  useEffect(() => {
    if (!slowMessage) return;
    const timer = setTimeout(() => setText(slowMessage), 3000);
    return () => clearTimeout(timer);
  }, [slowMessage]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={text}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 }}>
        {values.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              width: 3,
              height: 14,
              borderRadius: 2,
              backgroundColor: colors.primaryInk,
              opacity: v,
            }}
          />
        ))}
      </View>
      <AppText variant="caption" color="secondary">
        {text}
      </AppText>
    </View>
  );
}
