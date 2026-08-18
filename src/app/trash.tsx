import React, { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useDiary } from '@/state/useDiary';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

export default function TrashScreen() {
  const diary = useDiary();
  const retentionDays = useSettings((s) => s.diary.trashRetentionDays);
  const entries = useDiary((s) => s.entries);
  const trashed = useMemo(() => entries.filter((e) => e.status === 'trashed'), [entries]);

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <AppText variant="caption" color="secondary">
          휴지통의 일기는 {retentionDays}일 후 자동으로 삭제돼요.
        </AppText>
        {trashed.length === 0 ? (
          <EmptyState icon="trash-2" title="휴지통이 비어 있어요" />
        ) : (
          trashed.map((entry) => (
            <Card key={entry.id} style={{ gap: spacing.sm }}>
              <AppText variant="subheading" numberOfLines={1}>
                {entry.title || entry.finalText.slice(0, 30)}
              </AppText>
              <AppText variant="caption" color="secondary">
                {entry.localDate}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button small variant="secondary" label="복원" onPress={() => diary.restoreEntry(entry.id)} />
                <Button small variant="danger" label="영구 삭제" onPress={() => diary.deleteForever(entry.id)} />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
