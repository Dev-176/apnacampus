import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { authService, formatAuthError } from '../../features/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your student email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authService.resetPassword(email);
      setSuccessMessage(
        'Password recovery link has been sent to your email. Please check your inbox and spam folder.'
      );
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logoTitle}>ApnaCampus</Text>
            <Text style={styles.tagline}>"Apne Shehar Se, Apne Campus Tak."</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reset Password</Text>
            <Text style={styles.cardSubtitle}>
              Enter the student email associated with your account, and we'll send you instructions to reset your password.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBanner} accessibilityRole="alert">
                <Text style={styles.successBannerText}>{successMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Student Email"
              placeholder="e.g. rahul@college.ac.in"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Button
              title="Send Recovery Link"
              loading={loading}
              onPress={handleResetPassword}
              style={styles.actionButton}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="link"
            >
              <Text style={styles.backText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoTitle: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '800',
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.accentDark,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '500',
  },
  successBanner: {
    backgroundColor: colors.successBackground,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  successBannerText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  actionButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  backButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
