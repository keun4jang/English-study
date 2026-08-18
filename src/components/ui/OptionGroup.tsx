import React from 'react';
import { View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Chip } from './Chip';

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface OptionGroupProps<T extends string> {
  title?: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** 온보딩/설정에서 쓰는 단일 선택 옵션 그룹 */
export function OptionGroup<T extends string>({ title, options, value, onChange }: OptionGroupProps<T>) {
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? <AppText variant="label">{title}</AppText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </View>
      {selected?.description ? (
        <AppText variant="caption" color="secondary">
          {selected.description}
        </AppText>
      ) : null}
    </View>
  );
}
