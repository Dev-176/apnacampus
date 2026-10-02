import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../../../constants/theme';
import { Avatar } from '../../../components/Avatar';
import { EmptyState, Skeleton, ErrorState } from '../../../components/FeedbackStates';
import { useAuth } from '../../../features/auth';
import {
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useMarkRead,
  useConversations,
  ChatMessage,
  ConversationItem,
} from '../../../features/chat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  const [inputText, setInputText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Queries & Mutations
  const { data: conversations = [] } = useConversations();
  const conversation: ConversationItem | undefined = conversations.find(
    (c) => c.conversation_id === conversationId
  );

  const {
    data: messages = [],
    isLoading,
    isError,
    error,
    refetch,
    isRealtimeConnected,
  } = useMessages(conversationId);

  const sendMessageMutation = useSendMessage(conversationId);
  const deleteMessageMutation = useDeleteMessage(conversationId);
  const markReadMutation = useMarkRead(conversationId);

  // Mark messages as read when conversation is loaded or receives messages
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const hasUnread = messages.some(
        (m) => m.sender_id !== currentUserId && !m.read_at && !m.deleted_at
      );
      if (hasUnread) {
        markReadMutation.mutate();
      }
    }
  }, [conversationId, messages, currentUserId, markReadMutation]);

  // Handle sending a message
  const handleSend = async (retryBody?: string, retryClientId?: string) => {
    const textToSend = retryBody !== undefined ? retryBody : inputText.trim();
    if (!textToSend) return;

    if (conversation && !conversation.is_connection_active) {
      Alert.alert('Connection Inactive', 'You cannot send messages to an inactive connection.');
      return;
    }

    const clientId = retryClientId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (!retryBody) {
      setInputText('');
    }

    try {
      await sendMessageMutation.mutateAsync({
        body: textToSend,
        clientId,
        currentUserId,
      });
    } catch (err: unknown) {
      // Error state is already recorded in the message item in useSendMessage
      console.warn('Failed to send message:', err);
    }
  };

  // Handle message long-press
  const handleLongPress = (msg: ChatMessage) => {
    if (msg.deleted_at) return;
    setSelectedMessage(msg);
    setShowActionModal(true);
  };

  // Delete for me
  const handleDeleteForMe = async () => {
    if (!selectedMessage) return;
    try {
      await deleteMessageMutation.mutateAsync({
        messageId: selectedMessage.id,
        deleteType: 'for_me',
      });
      setShowActionModal(false);
      setSelectedMessage(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not delete message';
      Alert.alert('Error', errorMsg);
    }
  };

  // Delete for everyone
  const handleDeleteForEveryone = async () => {
    if (!selectedMessage) return;
    try {
      await deleteMessageMutation.mutateAsync({
        messageId: selectedMessage.id,
        deleteType: 'for_everyone',
      });
      setShowActionModal(false);
      setSelectedMessage(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not delete message for everyone';
      Alert.alert('Error', errorMsg);
    }
  };

  // Check if message is within 10 minutes for delete for everyone
  const canDeleteForEveryone =
    selectedMessage &&
    selectedMessage.sender_id === currentUserId &&
    !selectedMessage.deleted_at &&
    Date.now() - new Date(selectedMessage.created_at).getTime() < 10 * 60 * 1000;

  // Render individual message bubble
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === currentUserId;
    const isDeleted = Boolean(item.deleted_at);
    const formattedTime = new Date(item.created_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.9}
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.theirBubble,
            isDeleted && styles.deletedBubble,
            item.state === 'failed' && styles.failedBubble,
          ]}
        >
          {isDeleted ? (
            <Text style={styles.deletedText}>🚫 This message was deleted</Text>
          ) : (
            <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
              {item.body}
            </Text>
          )}

          <View style={styles.metaRow}>
            <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
              {formattedTime}
            </Text>

            {isMe && !isDeleted && (
              <View style={styles.stateIndicator}>
                {item.state === 'sending' ? (
                  <Text style={styles.sendingIcon}>🕒</Text>
                ) : item.state === 'failed' ? (
                  <TouchableOpacity
                    onPress={() => handleSend(item.body, item.client_id)}
                    style={styles.retryButton}
                  >
                    <Text style={styles.failedText}>⚠️ Failed (Tap to retry)</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.deliveredIcon}>{item.read_at ? '✓✓' : '✓'}</Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
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
          accessibilityLabel="Back to messages"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfileInfo}
          onPress={() => {
            if (conversation?.other_user_id) {
              router.push(`/(app)/students/${conversation.other_user_id}` as Href);
            }
          }}
          activeOpacity={0.8}
        >
          <Avatar
            name={conversation?.other_full_name || 'Student'}
            url={conversation?.other_avatar_url}
            size="sm"
          />
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation?.other_full_name || 'Campus Student'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              🎓 {conversation?.other_college_name || 'Peer'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowHeaderMenu(true)}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel="Chat options"
        >
          <Text style={styles.moreButtonText}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {!isRealtimeConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚡ You're offline. Reconnecting to chat server...
          </Text>
        </View>
      )}

      {/* Read-Only Inactive Banner */}
      {conversation && !conversation.is_connection_active && (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyBannerText}>
            🔒 This conversation is read-only because you are no longer connected.
          </Text>
        </View>
      )}

      {/* Message List */}
      <View style={styles.chatArea}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <Skeleton width="60%" height={44} borderRadius={radius.md} style={{ alignSelf: 'flex-start', marginBottom: spacing.md }} />
            <Skeleton width="70%" height={56} borderRadius={radius.md} style={{ alignSelf: 'flex-end', marginBottom: spacing.md }} />
            <Skeleton width="50%" height={40} borderRadius={radius.md} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : isError ? (
          <ErrorState
            message={error?.message || 'Check your connection and try again.'}
            onRetry={refetch}
          />
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              title={`Say hello to ${conversation?.other_full_name?.split(' ')[0] || 'your peer'}! 👋`}
              description="Start your conversation about classes, projects, campus life, or hometown experiences."
            />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.client_id || item.id}
            renderItem={renderMessageItem}
            inverted={true}
            contentContainerStyle={styles.messageListContent}
          />
        )}
      </View>

      {/* Message Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              conversation && !conversation.is_connection_active
                ? 'Conversation is read-only'
                : 'Type a message... (max 2000 chars)'
            }
            placeholderTextColor={colors.textMuted}
            multiline={true}
            maxLength={2000}
            editable={Boolean(conversation?.is_connection_active)}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !conversation?.is_connection_active) &&
                styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || !conversation?.is_connection_active}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Text style={styles.sendButtonText}>➔</Text>
          </TouchableOpacity>
        </View>

        {inputText.length > 1800 && (
          <Text style={styles.charCountText}>{inputText.length} / 2000</Text>
        )}
      </KeyboardAvoidingView>

      {/* Message Options Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionSheetContainer}>
            <Text style={styles.actionSheetTitle}>Message Options</Text>

            <TouchableOpacity style={styles.actionSheetItem} onPress={handleDeleteForMe}>
              <Text style={styles.actionSheetItemText}>🗑️ Delete for me</Text>
            </TouchableOpacity>

            {canDeleteForEveryone && (
              <TouchableOpacity
                style={[styles.actionSheetItem, styles.destructiveActionItem]}
                onPress={handleDeleteForEveryone}
              >
                <Text style={styles.destructiveActionItemText}>
                  🗑️ Delete for everyone (within 10m)
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionSheetItem, styles.cancelActionItem]}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.cancelActionItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header More Options Menu */}
      <Modal
        visible={showHeaderMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View style={styles.actionSheetContainer}>
            <Text style={styles.actionSheetTitle}>Chat Settings</Text>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setShowHeaderMenu(false);
                if (conversation?.other_user_id) {
                  router.push(`/(app)/students/${conversation.other_user_id}` as Href);
                }
              }}
            >
              <Text style={styles.actionSheetItemText}>👤 View Student Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setShowHeaderMenu(false);
                // TODO(phase-9): Block Student
                Alert.alert(
                  'Block Student',
                  'Blocking will be integrated into the safety center in Phase 9.'
                );
              }}
            >
              <Text style={styles.actionSheetItemText}>🚫 Block Student</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetItem, styles.destructiveActionItem]}
              onPress={() => {
                setShowHeaderMenu(false);
                // TODO(phase-9): Safety & Moderation reporting
                Alert.alert(
                  'Report Student',
                  'Reporting system will be integrated into the safety center in Phase 9.'
                );
              }}
            >
              <Text style={styles.destructiveActionItemText}>🚩 Report Conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetItem, styles.cancelActionItem]}
              onPress={() => setShowHeaderMenu(false)}
            >
              <Text style={styles.cancelActionItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  headerProfileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  headerTextGroup: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  headerName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  moreButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  moreButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '800',
  },
  offlineBanner: {
    backgroundColor: colors.warningBackground,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  offlineBannerText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  readOnlyBanner: {
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  readOnlyBannerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  messageListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.subtle,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deletedBubble: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  failedBubble: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
  },
  messageText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 21,
  },
  myText: {
    color: colors.surface,
  },
  theirText: {
    color: colors.textPrimary,
  },
  deletedText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  theirTimeText: {
    color: colors.textMuted,
  },
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  deliveredIcon: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
  },
  retryButton: {
    paddingLeft: spacing.xs,
  },
  failedText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderDark,
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  charCountText: {
    ...typography.caption,
    textAlign: 'right',
    paddingRight: spacing.md,
    paddingBottom: 2,
    color: colors.warning,
    backgroundColor: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
  },
  actionSheetTitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  actionSheetItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionSheetItemText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  destructiveActionItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  destructiveActionItemText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.error,
  },
  cancelActionItem: {
    borderBottomWidth: 0,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  cancelActionItemText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
