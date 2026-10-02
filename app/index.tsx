import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, shadows } from '../constants/theme';

export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>BETA • STUDENT COMMUNITY</Text>
        </View>
        <Text style={styles.title}>ApnaCampus</Text>
        <Text style={styles.tagline}>"Apne Shehar Se, Apne Campus Tak."</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Phase 0: Foundation</Text>
        <Text style={styles.cardDescription}>
          Architecture initialized with Expo Router, strict TypeScript, Supabase client with SecureStore persistence, Zod environment validation, and TanStack Query.
        </Text>

        <View style={styles.pillRow}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Backend: Supabase RLS Ready</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Connecting students from the same hometown across college campuses.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  badgeContainer: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.accentDark,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
