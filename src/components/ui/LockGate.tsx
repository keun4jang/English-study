import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PIN_LENGTH } from '@/lib/appLock';
import { useLock } from '@/state/useLock';
import { MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * 잠금 화면.
 *
 * 잠금이 켜져 있고 아직 안 열렸으면 앱 위를 덮는다.
 *
 * 숫자 키패드를 직접 그린다. 시스템 키보드를 띄우면 화면이 반쯤 가려지고, 폰마다
 * 자판이 달라서 네 자리를 누르는 데 걸리는 시간이 들쭉날쭉해진다. 매번 여는 화면이라
 * 이 차이가 크게 느껴진다.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function LockGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const enabled = useLock((s) => s.enabled);
  const unlocked = useLock((s) => s.unlocked);
  const failedAttempts = useLock((s) => s.failedAttempts);
  const verify = useLock((s) => s.verify);
  const disable = useLock((s) => s.disable);
  const markUnlocked = useLock((s) => s.markUnlocked);

  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // 잠금을 꺼 둔 사람은 이 화면을 만나지 않는다
  useEffect(() => {
    if (!enabled && !unlocked) markUnlocked();
  }, [enabled, unlocked, markUnlocked]);

  if (!enabled || unlocked) return <>{children}</>;

  // 마지막 자리를 누르는 순간 확인한다. 효과(useEffect) 안에서 확인하면 상태가 두 번
  // 바뀌면서 React Compiler가 최적화를 포기하고, 무엇보다 어디서 검사가 시작되는지가
  // 코드에서 안 보인다.
  const press = (key: string) => {
    if (checking) return;
    setWrong(false);
    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (!key || pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    setChecking(true);
    verify(next)
      .then((ok) => {
        if (!ok) {
          setWrong(true);
          setPin('');
        }
      })
      .finally(() => setChecking(false));
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.xl,
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <AppIcon name="lock" size={32} color="accent" />
        <AppText variant="subheading">잠금을 풀어 주세요</AppText>
        <AppText variant="caption" color="secondary" align="center">
          {wrong
            ? `PIN이 맞지 않아요. 다시 눌러 주세요. (${failedAttempts}번 틀렸어요)`
            : '설정해 둔 네 자리 숫자를 눌러 주세요.'}
        </AppText>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${PIN_LENGTH}자리 중 ${pin.length}자리 입력함`}
        style={{ flexDirection: 'row', gap: spacing.md }}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 2,
              borderColor: wrong ? colors.error : colors.primaryBorder,
              backgroundColor: i < pin.length ? (wrong ? colors.error : colors.primaryBorder) : 'transparent',
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: spacing.md }}>
        {KEYS.map((key, index) => (
          <Pressable
            key={`${key}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={key === 'del' ? '한 자리 지우기' : key ? `숫자 ${key}` : ''}
            disabled={!key}
            onPress={() => press(key)}
            style={({ pressed }) => ({
              width: 72,
              height: MIN_TOUCH_TARGET + 12,
              borderRadius: radius.button,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: !key
                ? 'transparent'
                : pressed
                  ? colors.pressedBackground
                  : colors.surface,
              borderWidth: key ? 1 : 0,
              borderColor: colors.border,
            })}
          >
            {key === 'del' ? (
              <AppIcon name="delete" size={20} />
            ) : (
              <AppText variant="heading">{key}</AppText>
            )}
          </Pressable>
        ))}
      </View>

      {showForgot ? (
        <View style={{ gap: spacing.sm, maxWidth: 320 }}>
          <AppText variant="bodySmall" color="secondary" align="center">
            잠금을 끄고 들어갈 수 있어요. 이 잠금은 일기 본문을 암호로 바꾸지 않기 때문에,
            잊었다고 해서 일기를 못 보게 만들지는 않아요.
          </AppText>
          <Button label="잠금 끄고 들어가기" variant="secondary" onPress={disable} />
          <Button label="다시 눌러볼게요" variant="ghost" onPress={() => setShowForgot(false)} />
        </View>
      ) : (
        <Button label="PIN을 잊었어요" variant="ghost" onPress={() => setShowForgot(true)} />
      )}
    </View>
  );
}
