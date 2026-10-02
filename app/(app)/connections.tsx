import React from 'react';
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
import { useConnectionsList, ConnectionItem } from '../../features/connections';
import { chatService } from '../../features/chat';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { data: connections = [], isLoading, isError, error, refetch, isRefetching } =
    useConnectionsList();

  const handleMessagePress = async (item: ConnectionItem) => {
    try {
      const convId = await chatService.getOrCreateConversation(item.connection_id);
      router.push(`/(app)/chat/${convId}` as Href);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to open conversation';
      Alert.alert('Error', errorMsg);
    }
  };

  const renderConnectionItem = ({ item }: { item: ConnectionItem }) => {
    const formattedDate = item.connected_at
      ? new Date(item.connected_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })
      : '';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => router.push(`/(app)/students/${item.user_id}` as Href)}
          activeOpacity={0.7}
        >
          <Avatar name={item.full_name} url={item.avatar_url} size="md" />
          <View style={styles.textContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>{item.full_name}</Text>
              {formattedDate ? (
                <Text style={styles.connectedDate}>Connected {formattedDate}</Text>
              ) : null}
            </View>
            {item.username ? (
              <Text style={styles.username}>@{item.username}</Text>
            ) : null}
            <Text style={styles.academicInfo} numberOfLines={1}>
              🎓 {item.college_name || 'College'}
            </Text>
            <Text style={styles.locationInfo}>
              🏠 {item.home_city_name || 'Hometown'} ➔ 📍 {item.current_city_name || 'Campus'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <Button
            title="💬 Message"
            variant="outline"
            size="sm"
            onPress={() => handleMessagePress(item)}
            style={styles.messageButton}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>
          My Connections ({connections.length})
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/requests' as Href)}
          style={styles.requestsLink}
        >
          <Text style={styles.requestsLinkText}>Requests</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isError ? (
        <ErrorState
          message={error?.message || 'Failed to load connections.'}
          onRetry={refetch}
        />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={120} borderRadius={radius.card} style={{ marginBottom: spacing.md }} />
          <Skeleton width="100%" height={120} borderRadius={radius.card} />
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.connection_id}
          renderItem={renderConnectionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No connections yet"
              description="Connect with students from your hometown, college, and course to build your peer circle!"
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
  requestsLink: {
    paddingVertical: spacing.xs,
  },
  requestsLinkText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  connectedDate: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  username: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  academicInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationInfo: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  buttonRow: {
    marginTop: spacing.md,
    alignItems: 'flex-end',
  },
  messageButton: {
    width: 120,
  },
});
