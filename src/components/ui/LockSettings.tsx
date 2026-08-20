import React, { useState } from 'react';
import { View } from 'react-native';

import { PIN_LENGTH, isLockSupported, isValidPin } from '@/lib/appLock';
import { useLock } from '@/state/useLock';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { TextField } from './TextField';

/**
 * 잠금 설정.
 *
 * 이 잠금이 무엇을 막고 무엇을 못 막는지 화면에서 그대로 말한다. "안전하게 보관됩니다"
 * 같은 말로 덮으면 사용자는 실제보다 더 믿고 더 민감한 것을 쓰게 된다.
 */
export function LockSettings() {
  const enabled = useLock((s) => s.enabled);
  const enable = useLock((s) => s.enable);
  const disable = useLock((s) => s.disable);

  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isLockSupported()) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <AppText variant="bodySmall">앱 잠금</AppText>
        <AppText variant="caption" color="secondary">
          이 브라우저에서는 잠금을 쓸 수 없어요. 최신 브라우저에서 다시 열어 보세요.
        </AppText>
      </Card>
    );
  }

  const reset = () => {
    setOpen(false);
    setPin('');
    setConfirmPin('');
    setError(null);
  };

  const submit = () => {
    if (!isValidPin(pin)) {
      setError(`숫자 ${PIN_LENGTH}자리로 정해 주세요.`);
      return;
    }
    if (pin !== confirmPin) {
      setError('두 번 입력한 숫자가 달라요.');
      return;
    }
    setSaving(true);
    enable(pin)
      .then(reset)
      .catch(() => setError('잠금을 켜지 못했어요. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setSaving(false));
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="bodySmall" weight="600">
          앱 잠금 {enabled ? '· 켜짐' : '· 꺼짐'}
        </AppText>
        <AppText variant="caption" color="secondary">
          앱을 열 때 숫자 {PIN_LENGTH}자리를 물어봐요. 폰을 잠깐 빌려줄 때 누가 눌러 보는 걸 막아
          줘요.
        </AppText>
        <AppText variant="caption" color="secondary">
          다만 일기 본문을 암호로 바꾸지는 않아요. 그래서 <AppText variant="caption" weight="700">PIN을
          잊어도 일기를 잃지 않고</AppText>, 잠금 화면에서 끄고 들어갈 수 있어요. 반대로 말하면
          기기를 완전히 잃어버렸을 때까지 지켜주지는 못해요.
        </AppText>
      </View>

      {enabled ? (
        <Button size="compact" variant="secondary" icon="unlock" label="잠금 끄기" onPress={disable} />
      ) : open ? (
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="새 PIN"
            placeholder={'0'.repeat(PIN_LENGTH)}
            value={pin}
            onChangeText={(next) => {
              setError(null);
              setPin(next.replace(/\D/g, '').slice(0, PIN_LENGTH));
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
          />
          <TextField
            label="한 번 더"
            placeholder={'0'.repeat(PIN_LENGTH)}
            value={confirmPin}
            onChangeText={(next) => {
              setError(null);
              setConfirmPin(next.replace(/\D/g, '').slice(0, PIN_LENGTH));
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
          />
          {error ? (
            <AppText variant="caption" color="error">
              {error}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button size="compact" label="잠금 켜기" loading={saving} onPress={submit} />
            <Button size="compact" variant="ghost" label="취소" onPress={reset} />
          </View>
        </View>
      ) : (
        <Button size="compact" variant="secondary" icon="lock" label="잠금 켜기" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}
