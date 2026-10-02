import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments, Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { AuthProvider, useAuth } from '../features/auth';
import { colors, typography, spacing } from '../constants/theme';

function NavigationGate({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = (segments[0] as string | undefined) || '';
    const inAuthGroup = firstSegment === '(auth)';
    const inAppGroup = firstSegment === '(app)';
    const isOnboarding = firstSegment === 'onboarding';
    const isSuspended = firstSegment === 'suspended';

    // 1. No active session -> route to Login
    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as Href);
      }
      return;
    }

    // 2. Account is suspended or banned
    if (profile?.is_banned || profile?.is_suspended) {
      if (!isSuspended) {
        router.replace('/suspended' as Href);
      }
      return;
    }

    // 3. Logged in but profile setup not completed
    if (profile && !profile.is_onboarded) {
      if (!isOnboarding) {
        router.replace('/onboarding' as Href);
      }
      return;
    }

    // 4. Fully onboarded active student -> route to Home
    if (profile?.is_onboarded) {
      if (!inAppGroup) {
        router.replace('/(app)' as Href);
      }
    }
  }, [session, profile, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashContent}>
          <Text style={styles.splashTitle}>ApnaCampus</Text>
          <Text style={styles.splashTagline}>"Apne Shehar Se, Apne Campus Tak."</Text>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xxl }}
          />
        </View>
        <Text style={styles.splashFooter}>Student Community & Peer Network</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor={colors.surface} />
          <NavigationGate>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: colors.surface,
                },
                headerTintColor: colors.primary,
                headerTitleStyle: {
                  fontWeight: '600',
                },
                contentStyle: {
                  backgroundColor: colors.background,
                },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/index" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/discover" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/students/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/requests" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/connections" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/messages" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/chat/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="(app)/profile" options={{ headerShown: false }} />
              <Stack.Screen name="suspended" options={{ headerShown: false }} />
            </Stack>
          </NavigationGate>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xxl,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    ...typography.h1,
    fontSize: 34,
    color: colors.primary,
    fontWeight: '800',
  },
  splashTagline: {
    ...typography.body,
    color: colors.accentDark,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  splashFooter: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
