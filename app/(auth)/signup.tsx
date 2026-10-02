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

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [is18Confirmed, setIs18Confirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your student email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }
    if (!is18Confirmed) {
      setErrorMessage(
        'You must confirm that you are 18 years or older to join ApnaCampus (complying with India’s DPDP Act).'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await authService.signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        is18Confirmed: true,
      });
      // Successful signup triggers auth change -> redirects to onboarding wizard
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoTitle}>ApnaCampus</Text>
            <Text style={styles.tagline}>"Apne Shehar Se, Apne Campus Tak."</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join the Student Community</Text>

            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setErrorMessage(null);
              }}
            />

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

            <Input
              label="Create Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMessage(null);
              }}
              secureTextEntry
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrorMessage(null);
              }}
              secureTextEntry
            />

            {/* 18+ Confirmation Mandatory for India DPDP Act */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIs18Confirmed(!is18Confirmed);
                setErrorMessage(null);
              }}
              style={styles.checkboxContainer}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: is18Confirmed }}
              accessibilityLabel="I confirm that I am 18 years of age or older"
            >
              <View
                style={[
                  styles.checkboxBox,
                  is18Confirmed && styles.checkboxBoxChecked,
                ]}
              >
                {is18Confirmed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxTitle}>I confirm that I am 18+ years old</Text>
                <Text style={styles.checkboxSubtitle}>
                  In compliance with India's Digital Personal Data Protection (DPDP) Act, ApnaCampus is exclusively available to adults 18 and older.
                </Text>
              </View>
            </TouchableOpacity>

            <Button
              title="Create Account & Continue"
              loading={loading}
              onPress={handleSignup}
              style={styles.actionButton}
            />
          </View>

          {/* Footer Link to Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="link"
            >
              <Text style={styles.loginLink}>Sign In</Text>
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
    marginBottom: spacing.xl,
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
    marginBottom: spacing.lg,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  checkboxSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 16,
  },
  actionButton: {
    width: '100%',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    minHeight: 48,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
});
