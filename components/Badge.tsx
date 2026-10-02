import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, typography, spacing } from '../constants/theme';

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successBackground, text: colors.success };
      case 'warning':
        return { bg: colors.warningBackground, text: colors.warning };
      case 'error':
        return { bg: colors.errorBackground, text: colors.error };
      case 'info':
        return { bg: colors.infoBackground, text: colors.info };
      case 'primary':
        return { bg: colors.surfaceSubtle, text: colors.primary };
      case 'neutral':
      default:
        return { bg: colors.border, text: colors.textSecondary };
    }
  };

  const { bg, text } = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
