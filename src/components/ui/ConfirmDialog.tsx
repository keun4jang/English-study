import React from 'react';
import { Modal, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

/**
 * 되돌릴 수 없는 동작을 하기 전에 한 번 묻는 창.
 *
 * 두 가지를 지킨다.
 * - **무엇이 사라지는지 숫자로 적는다.** "정말 삭제할까요?"만으로는 무게를 알 수 없다.
 * - **취소가 기본이다.** 위험한 쪽을 아래에 두고, 취소를 눌러도 아무 일이 없게 한다.
 */

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = '취소',
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.scrim,
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Card style={{ gap: spacing.md }}>
          <AppText variant="subheading">{title}</AppText>
          <AppText variant="bodySmall" color="secondary">
            {description}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            <Button variant="danger" icon="trash-2" label={confirmLabel} onPress={onConfirm} />
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
