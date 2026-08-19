import React from 'react';
import { Modal, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

/**
 * 저장하지 않고 나가려 할 때 뜨는 확인창.
 *
 * 선택지는 항상 셋이고 순서도 고정한다 — 화면마다 다르면 뒤로가기를 눌렀을 때
 * 무엇을 누르게 될지 예측할 수 없다.
 *   1) 저장하고 나가기   (기본, 강조)
 *   2) 저장 안 하고 나가기
 *   3) 계속 쓰기         (닫기)
 *
 * "저장 안 하고 나가기"에는 무엇이 사라지는지(또는 사라지지 않는지)를 반드시 적는다.
 */

interface ExitConfirmDialogProps {
  visible: boolean;
  title: string;
  /** 나가면 무슨 일이 생기는지 */
  description: string;
  saveLabel: string;
  onSave: () => void;
  /** 저장하지 않고 나갈 때 버튼에 붙일 부연 (예: "쓴 내용이 사라져요") */
  discardLabel: string;
  onDiscard: () => void;
  onCancel: () => void;
}

export function ExitConfirmDialog({
  visible,
  title,
  description,
  saveLabel,
  onSave,
  discardLabel,
  onDiscard,
  onCancel,
}: ExitConfirmDialogProps) {
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
            <Button icon="check" label={saveLabel} onPress={onSave} />
            <Button variant="secondary" label={discardLabel} onPress={onDiscard} />
            <Button variant="ghost" label="계속 쓰기" onPress={onCancel} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
