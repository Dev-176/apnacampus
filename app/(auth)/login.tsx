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
import { useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { authService, formatAuthError } from '../../features/auth';
import { FEATURE_FLAGS } from '../../constants/featureFlags';

export default function LoginScreen() {
  const router = useRouter();

  // Mode: 'email' or 'otp'
  const [authMode, setAuthMode] = useState<'email' | 'otp'>('email');

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP state
  const [phone, setPhone] = useState('+91');
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await authService.signIn({ email: email.trim(), password });
      // Session change triggers navigation in _layout
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 13) {
      setErrorMessage('Please enter a valid 10-digit mobile number with +91.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await authService.sendPhoneOtp(phone);
      setOtpSent(true);
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpToken || otpToken.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await authService.verifyPhoneOtp(phone, otpToken);
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

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Sign In</Text>

            {/* Auth Mode Toggle if Phone OTP enabled */}
            {FEATURE_FLAGS.ENABLE_PHONE_OTP && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('email');
                    setErrorMessage(null);
                  }}
                  style={[styles.tab, authMode === 'email' && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      authMode === 'email' && styles.tabTextActive,
                    ]}
                  >
                    Email & Password
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('otp');
                    setErrorMessage(null);
                  }}
                  style={[styles.tab, authMode === 'otp' && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      authMode === 'otp' && styles.tabTextActive,
                    ]}
                  >
                    Mobile OTP
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {authMode === 'email' ? (
              <>
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
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMessage(null);
                  }}
                  secureTextEntry
                />

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password' as Href)}
                  style={styles.forgotPasswordButton}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot Password"
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <Button
                  title="Sign In"
                  loading={loading}
                  onPress={handleEmailLogin}
                  style={styles.actionButton}
                />
              </>
            ) : (
              <>
                <Input
                  label="Mobile Number"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setErrorMessage(null);
                  }}
                  keyboardType="phone-pad"
                  editable={!otpSent}
                />

                {otpSent ? (
                  <>
                    <Input
                      label="6-Digit OTP"
                      placeholder="123456"
                      value={otpToken}
                      onChangeText={(text) => {
                        setOtpToken(text);
                        setErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                    />

                    <Button
                      title="Verify & Sign In"
                      loading={loading}
                      onPress={handleVerifyOtp}
                      style={styles.actionButton}
                    />

                    <TouchableOpacity
                      onPress={handleSendOtp}
                      style={styles.resendButton}
                    >
                      <Text style={styles.resendText}>Resend OTP</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Button
                    title="Send OTP"
                    loading={loading}
                    onPress={handleSendOtp}
                    style={styles.actionButton}
                  />
                )}
              </>
            )}
          </View>

          {/* Footer Link to Signup */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to campus? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup' as Href)}
              accessibilityRole="link"
            >
              <Text style={styles.signupLink}>Create an Account</Text>
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
    minHeight: '100%',
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
    marginBottom: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  actionButton: {
    width: '100%',
    marginTop: spacing.xs,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  resendText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
    minHeight: 48,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  signupLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
});
