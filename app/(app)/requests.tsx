import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../../constants/theme';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { EmptyState, Skeleton, ErrorState } from '../../components/FeedbackStates';
import {
  useIncomingRequests,
  useOutgoingRequests,
  useRespondConnectionRequest,
  useWithdrawConnectionRequest,
  ConnectionRequestItem,
} from '../../features/connections';

export default function RequestsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  const incomingQuery = useIncomingRequests();
  const outgoingQuery = useOutgoingRequests();

  const respondMutation = useRespondConnectionRequest();
  const withdrawMutation = useWithdrawConnectionRequest();

  const currentQuery = activeTab === 'incoming' ? incomingQuery : outgoingQuery;

  const handleAccept = async (item: ConnectionRequestItem) => {
    try {
      await respondMutation.mutateAsync({
        requestId: item.request_id,
        action: 'accept',
      });
      // TODO(phase-4): Open direct chat with connection
      Alert.alert(
        'Connected! 🎉',
        `You and ${item.full_name.split(' ')[0]} are now connected. Chat will open in Phase 4!`,
        [
          { text: 'View Connections', onPress: () => router.push('/(app)/connections' as Href) },
          { text: 'OK' },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept request';
      Alert.alert('Error', msg);
    }
  };

  const handleReject = async (item: ConnectionRequestItem) => {
    try {
      await respondMutation.mutateAsync({
        requestId: item.request_id,
        action: 'reject',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline request';
      Alert.alert('Error', msg);
    }
  };

  const handleWithdraw = async (item: ConnectionRequestItem) => {
    try {
      await withdrawMutation.mutateAsync({
        requestId: item.request_id,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to withdraw request';
      Alert.alert('Error', msg);
    }
  };

  const renderRequestItem = ({ item }: { item: ConnectionRequestItem }) => {
    const isIncoming = activeTab === 'incoming';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => router.push(`/(app)/students/${item.user_id}` as Href)}
          activeOpacity={0.7}
        >
          <Avatar name={item.full_name} url={item.avatar_url} size="md" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.fullName}>{item.full_name}</Text>
            {item.username ? (
              <Text style={styles.username}>@{item.username}</Text>
            ) : null}
            <Text style={styles.academicInfo} numberOfLines={1}>
              🎓 {item.college_name || 'College'}
            </Text>
            <Text style={styles.locationPill}>
              🏠 {item.home_city_name || 'Hometown'} ➔ 📍 {item.current_city_name || 'Campus'}
            </Text>
          </View>
        </TouchableOpacity>

        {item.intro_message ? (
          <View style={styles.introBox}>
            <Text style={styles.introLabel}>INTRO NOTE</Text>
            <Text style={styles.introMessage}>"{item.intro_message}"</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {isIncoming ? (
            <>
              <Button
                title="Decline"
                variant="outline"
                size="sm"
                onPress={() => handleReject(item)}
                disabled={respondMutation.isPending}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Accept"
                size="sm"
                onPress={() => handleAccept(item)}
                disabled={respondMutation.isPending}
                style={{ flex: 1, marginLeft: spacing.sm }}
              />
            </>
          ) : (
            <Button
              title="Withdraw Request"
              variant="outline"
              size="sm"
              onPress={() => handleWithdraw(item)}
              disabled={withdrawMutation.isPending}
              style={{ width: '100%' }}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Connection Requests</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/connections' as Href)}
          style={styles.connectionsLink}
        >
          <Text style={styles.connectionsLinkText}>Connected</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.tabActive]}
          onPress={() => setActiveTab('incoming')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'incoming' && styles.tabTextActive,
            ]}
          >
            Incoming {incomingQuery.data && incomingQuery.data.length > 0 ? `(${incomingQuery.data.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.tabActive]}
          onPress={() => setActiveTab('outgoing')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'outgoing' && styles.tabTextActive,
            ]}
          >
            Outgoing {outgoingQuery.data && outgoingQuery.data.length > 0 ? `(${outgoingQuery.data.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {currentQuery.isError ? (
        <ErrorState
          message={currentQuery.error?.message || 'Failed to load requests.'}
          onRetry={currentQuery.refetch}
        />
      ) : currentQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={140} borderRadius={radius.card} style={{ marginBottom: spacing.md }} />
          <Skeleton width="100%" height={140} borderRadius={radius.card} />
        </View>
      ) : (
        <FlatList
          data={currentQuery.data || []}
          keyExtractor={(item) => item.request_id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={currentQuery.isRefetching}
              onRefresh={currentQuery.refetch}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={activeTab === 'incoming' ? 'No incoming requests' : 'No outgoing requests'}
              description={
                activeTab === 'incoming'
                  ? 'When other students send you connection requests, they will appear here.'
                  : 'You have no pending requests sent to other students.'
              }
              actionText="Discover Students ➔"
              onAction={() => router.push('/(app)/discover' as Href)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  navTitle: {
    ...typography.h3,
    fontSize: 17,
    color: colors.textPrimary,
  },
  connectionsLink: {
    paddingVertical: spacing.xs,
  },
  connectionsLinkText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  fullName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  username: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  academicInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationPill: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  introBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  introLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.accentDark,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  introMessage: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
