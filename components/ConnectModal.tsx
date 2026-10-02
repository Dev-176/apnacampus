import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { colors, radius, typography, spacing } from '../constants/theme';
import { Modal } from './Modal';
import { Button } from './Button';
import { useSendConnectionRequest } from '../features/connections';

export interface ConnectModalProps {
  visible: boolean;
  targetStudent: {
    id: string;
    fullName: string;
    homeCityName?: string | null;
    currentCityName?: string | null;
    collegeName?: string | null;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_CHAR_COUNT = 200;

export const ConnectModal: React.FC<ConnectModalProps> = ({
  visible,
  targetStudent,
  onClose,
  onSuccess,
}) => {
  const [introMessage, setIntroMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendMutation = useSendConnectionRequest();

  // Populate dynamic intro suggestion when modal opens
  useEffect(() => {
    if (visible && targetStudent) {
      setErrorMessage(null);
      const firstName = targetStudent.fullName.split(' ')[0] || 'there';
      let suggestion = `Hey ${firstName}! Would love to connect with you on ApnaCampus.`;

      if (targetStudent.homeCityName && targetStudent.currentCityName) {
        suggestion = `Hey ${firstName}! Saw you're also from ${targetStudent.homeCityName} studying in ${targetStudent.currentCityName}. Would love to connect!`;
      } else if (targetStudent.homeCityName) {
        suggestion = `Hey ${firstName}! Saw you're also from ${targetStudent.homeCityName}. Would love to connect!`;
      } else if (targetStudent.collegeName) {
        suggestion = `Hey ${firstName}! Saw we're both around ${targetStudent.collegeName}. Would love to connect!`;
      }

      setIntroMessage(suggestion.slice(0, MAX_CHAR_COUNT));
    }
  }, [visible, targetStudent]);

  if (!targetStudent) return null;

  const handleSend = async () => {
    setErrorMessage(null);
    try {
      await sendMutation.mutateAsync({
        receiverId: targetStudent.id,
        introMessage: introMessage.trim(),
      });
      // TODO(phase-8): Trigger connection request push/in-app notification
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send request';
      setErrorMessage(msg);
    }
  };

  const charsRemaining = MAX_CHAR_COUNT - introMessage.length;

  return (
    <Modal
      visible={visible}
      title={`Connect with ${targetStudent.fullName.split(' ')[0]}`}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Text style={styles.promptText}>
          Add a short note to introduce yourself (optional):
        </Text>

        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          maxLength={MAX_CHAR_COUNT}
          placeholder="Write a friendly intro..."
          placeholderTextColor={colors.textMuted}
          value={introMessage}
          onChangeText={setIntroMessage}
          editable={!sendMutation.isPending}
        />

        <View style={styles.counterRow}>
          <Text style={[styles.counterText, charsRemaining < 20 && styles.counterWarning]}>
            {introMessage.length}/{MAX_CHAR_COUNT}
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Button
            title="Cancel"
            variant="outline"
            size="md"
            onPress={onClose}
            disabled={sendMutation.isPending}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title={sendMutation.isPending ? 'Sending...' : 'Send Request'}
            size="md"
            onPress={handleSend}
            disabled={sendMutation.isPending}
            style={{ flex: 1, marginLeft: spacing.sm }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  promptText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counterRow: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  counterText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  counterWarning: {
    color: colors.warning,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
});
