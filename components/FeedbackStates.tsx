import React from 'react';
import { View, Text, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { colors, radius, typography, spacing } from '../constants/theme';
import { Button } from './Button';

// 1. ErrorState component
export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.centerContainer, style]}>
      <View style={styles.errorIconCircle}>
        <Text style={styles.errorIcon}>!</Text>
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorDescription}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try Again"
          variant="outline"
          size="sm"
          onPress={onRetry}
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
};

// 2. EmptyState component
export interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.centerContainer, style]}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
      {actionText && onAction ? (
        <Button
          title={actionText}
          size="sm"
          onPress={onAction}
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
};

// 3. Skeleton loader component
export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeletonBase,
        {
          width: width as DimensionValue,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

// 4. Toast notification component
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
}) => {
  if (!visible) return null;

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return { bg: colors.successBackground, border: colors.success, text: colors.success };
      case 'error':
        return { bg: colors.errorBackground, border: colors.error, text: colors.error };
      case 'info':
      default:
        return { bg: colors.infoBackground, border: colors.info, text: colors.info };
    }
  };

  const { bg, border, text } = getToastColors();

  return (
    <View style={[styles.toastContainer, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.toastText, { color: text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.errorBackground,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    marginTop: spacing.xs,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  actionButton: {
    marginTop: spacing.xs,
  },
  skeletonBase: {
    backgroundColor: colors.surfaceSubtle,
    opacity: 0.7,
  },
  toastContainer: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
