import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

type Variant = 'primary' | 'danger' | 'secondary';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

const VARIANT_STYLES: Record<
  Variant,
  { background: string; text: string; border?: string }
> = {
  primary: { background: '#2563EB', text: '#FFFFFF' },
  danger: { background: '#DC2626', text: '#FFFFFF' },
  secondary: {
    background: '#FFFFFF',
    text: '#2563EB',
    border: '#2563EB',
  },
};

export function Button({
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPress,
  ...rest
}: ButtonProps) {
  const colors = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.background,
          borderColor: colors.border ?? colors.background,
          borderWidth: colors.border ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.text}
          accessibilityLabel="Memuat"
        />
      ) : (
        <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48, // Target sentuh ≥ 48dp
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
