import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, typography, spacing, shadows } from '../constants/theme';
import { Button } from '../components/Button';
import { useAuth } from '../features/auth';

export default function SuspendedScreen() {
  const { profile, signOut } = useAuth();

  const isBanned = profile?.is_banned;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⚠️</Text>
        </View>

        <Text style={styles.title}>
          {isBanned ? 'Account Terminated' : 'Account Temporarily Suspended'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.description}>
            {isBanned
              ? 'Your account has been permanently suspended due to severe or repeated violations of ApnaCampus Community Guidelines.'
              : 'Your account is under temporary administrative review to protect our student community.'}
          </Text>
          <Text style={styles.notice}>
            If you believe this decision was made in error, please reach out to our safety and support desk at support@apnacampus.in.
          </Text>
        </View>

        <Button
          title="Sign Out"
          variant="outline"
          onPress={signOut}
          style={styles.signOutButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    ...typography.h2,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginBottom: spacing.xxl,
    width: '100%',
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  notice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  signOutButton: {
    width: '100%',
  },
});
