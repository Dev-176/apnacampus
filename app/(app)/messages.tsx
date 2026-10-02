import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../../constants/theme';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { EmptyState, Skeleton, ErrorState } from '../../components/FeedbackStates';
import { useConversations, ConversationItem } from '../../features/chat';

export default function MessagesScreen() {
  const router = useRouter();
  const { data: conversations = [], isLoading, isError, error, refetch, isRefetching } =
    useConversations();

  const formatTimestamp = (isoDate: string | null) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    const formattedTime = formatTimestamp(item.last_message_at);

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => router.push(`/(app)/chat/${item.conversation_id}` as Href)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${item.other_full_name}`}
      >
        <Avatar name={item.other_full_name} url={item.other_avatar_url} size="md" />

        <View style={styles.contentContainer}>
          <View style={styles.topRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {item.other_full_name}
            </Text>
            {formattedTime ? (
              <Text style={styles.timeText}>{formattedTime}</Text>
            ) : null}
          </View>

          <View style={styles.academicRow}>
            <Text style={styles.academicText} numberOfLines={1}>
              🎓 {item.other_college_name || 'Campus Peer'}
              {item.other_branch_name ? ` • ${item.other_branch_name}` : ''}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.previewText,
                item.unread_count > 0 && styles.unreadPreviewText,
              ]}
              numberOfLines={1}
            >
              {item.last_message_preview || 'No messages yet'}
            </Text>

            <View style={styles.statusContainer}>
              {!item.is_connection_active ? (
                <Badge label="INACTIVE" variant="neutral" style={styles.inactiveBadge} />
              ) : null}
              {item.unread_count > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCountText}>
                    {item.unread_count > 99 ? '99+' : item.unread_count}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <Skeleton width="100%" height={80} borderRadius={radius.card} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="100%" height={80} borderRadius={radius.card} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="100%" height={80} borderRadius={radius.card} />
        </View>
      ) : isError ? (
        <ErrorState
          message={error?.message || 'Check your internet connection and try again.'}
          onRetry={refetch}
        />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No conversations yet"
            description="When you connect with fellow students, you can message them directly here."
            actionText="View My Connections 👥"
            onAction={() => router.push('/(app)/connections' as Href)}
          />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversation_id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
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
  header: {
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
    paddingRight: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 50,
  },
  loaderContainer: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  contentContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  timeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  academicRow: {
    marginTop: 2,
  },
  academicText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  previewText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadPreviewText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inactiveBadge: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
});
