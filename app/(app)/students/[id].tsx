import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { colors, radius, typography, spacing } from '../../../constants/theme';
import { Avatar } from '../../../components/Avatar';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';
import { Modal } from '../../../components/Modal';
import { ErrorState, Skeleton } from '../../../components/FeedbackStates';
import { ConnectModal } from '../../../components/ConnectModal';
import { useStudentProfile } from '../../../features/discover';
import { useConnectionStatus } from '../../../features/connections';
import { chatService } from '../../../features/chat';

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showActionModal, setShowActionModal] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentProfile(id);

  const {
    data: connStatus,
    refetch: refetchConnStatus,
  } = useConnectionStatus(id);

  const getYearOrdinal = (yr: number | null) => {
    if (!yr) return '';
    return yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : `${yr}th Year`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton width={88} height={88} borderRadius={44} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
          <Skeleton width={180} height={26} borderRadius={4} style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
          <Skeleton width={120} height={16} borderRadius={4} style={{ alignSelf: 'center', marginBottom: spacing.xl }} />
          <Skeleton width="100%" height={120} borderRadius={radius.md} style={{ marginBottom: spacing.lg }} />
          <Skeleton width="100%" height={120} borderRadius={radius.md} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <ErrorState
          message={error?.message || 'Student profile not found or is currently private.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {profile.full_name}
        </Text>
        <TouchableOpacity
          onPress={() => setShowActionModal(true)}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Text style={styles.moreButtonText}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.headerSection}>
          <Avatar
            name={profile.full_name}
            url={profile.avatar_url || undefined}
            size="xl"
          />

          <View style={styles.nameContainer}>
            <Text style={styles.fullName}>{profile.full_name}</Text>
            <View style={styles.badgeRow}>
              {profile.is_verified ? (
                <Badge label="VERIFIED STUDENT" variant="primary" style={styles.badge} />
              ) : null}
              {profile.is_seed ? (
                <Badge label="DEMO ACCOUNT" variant="warning" style={styles.badge} />
              ) : null}
            </View>
            {profile.username ? (
              <Text style={styles.username}>@{profile.username}</Text>
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {profile.bio ? (
          <Card style={styles.bioCard}>
            <Text style={styles.bioText}>"{profile.bio}"</Text>
          </Card>
        ) : null}

        {/* Cities Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardHeader}>CITIES & JOURNEY</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏠</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Hometown</Text>
              <Text style={styles.infoValue}>
                {profile.home_city?.name || 'Not specified'}
                {profile.home_city?.state ? `, ${profile.home_city.state}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Studying In (Campus City)</Text>
              <Text style={styles.infoValue}>
                {profile.current_city?.name || 'Not specified'}
                {profile.current_city?.state ? `, ${profile.current_city.state}` : ''}
              </Text>
            </View>
          </View>
        </Card>

        {/* College & Academics Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardHeader}>ACADEMICS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🎓</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>College / Institution</Text>
              <Text style={styles.infoValue}>
                {profile.college?.name || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📚</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Program & Branch</Text>
              <Text style={styles.infoValue}>
                {[
                  profile.course?.name,
                  profile.branch?.name,
                  getYearOrdinal(profile.year_of_study),
                ]
                  .filter(Boolean)
                  .join(' • ') || 'Not specified'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 ? (
          <Card style={styles.infoCard}>
            <Text style={styles.cardHeader}>INTERESTS & HOBBIES</Text>
            <View style={styles.chipsRow}>
              {profile.interests.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  selected={true}
                  style={styles.chip}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {/* Skills to teach */}
        {profile.skills_to_teach && profile.skills_to_teach.length > 0 ? (
          <Card style={styles.infoCard}>
            <Text style={styles.cardHeader}>SKILLS I CAN TEACH / SHARE</Text>
            <View style={styles.chipsRow}>
              {profile.skills_to_teach.map((skill) => (
                <Chip
                  key={skill}
                  label={`💡 ${skill}`}
                  selected={true}
                  style={styles.chip}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {/* DPDP Compliance Notice */}
        <View style={styles.privacyNoticeContainer}>
          <Text style={styles.privacyNoticeText}>
            🔒 Student privacy protected under DPDP Act. Phone numbers and email addresses are never disclosed.
          </Text>
        </View>

        {/* Connect Action Button - Activated in Phase 3 */}
        <View style={styles.actionContainer}>
          {connStatus?.status === 'accepted' ? (
            <Button
              title="Connected ✓ (Message)"
              variant="outline"
              size="lg"
              onPress={async () => {
                if (connStatus.requestId) {
                  try {
                    const convId = await chatService.getOrCreateConversation(connStatus.requestId);
                    router.push(`/(app)/chat/${convId}` as Href);
                  } catch (err: unknown) {
                    const errorMsg = err instanceof Error ? err.message : 'Failed to open chat';
                    Alert.alert('Error', errorMsg);
                  }
                }
              }}
            />
          ) : connStatus?.status === 'pending_sent' ? (
            <Button
              title="Request Pending..."
              variant="outline"
              size="lg"
              disabled={true}
            />
          ) : connStatus?.status === 'pending_received' ? (
            <Button
              title="Respond to Request ➔"
              size="lg"
              onPress={() => router.push('/(app)/requests' as Href)}
            />
          ) : connStatus?.status === 'blocked' ? (
            <Button
              title="Unavailable"
              variant="outline"
              size="lg"
              disabled={true}
            />
          ) : (
            <Button
              title="Connect with Student"
              size="lg"
              onPress={() => setIsConnectModalOpen(true)}
            />
          )}
        </View>
      </ScrollView>

      {/* Connect Bottom Sheet Modal */}
      <ConnectModal
        visible={isConnectModalOpen}
        targetStudent={
          profile
            ? {
                id: profile.id,
                fullName: profile.full_name,
                homeCityName: profile.home_city?.name,
                currentCityName: profile.current_city?.name,
                collegeName: profile.college?.name,
              }
            : null
        }
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={() => refetchConnStatus()}
      />

      {/* Action Menu Modal (Report / Block) */}
      <Modal
        visible={showActionModal}
        title="Student Safety & Actions"
        onClose={() => setShowActionModal(false)}
      >
        <View style={styles.actionModalContent}>
          <Button
            title="Report Student"
            variant="outline"
            disabled={true}
            onPress={() => {
              // TODO(phase-9): Safety moderation
              Alert.alert('Reporting', 'Report student feature opens in Phase 9.');
            }}
            style={styles.modalActionButton}
          />
          <Button
            title="Block Student"
            variant="danger"
            disabled={true}
            onPress={() => {
              // TODO(phase-9): Safety moderation
              Alert.alert('Blocking', 'Block student feature opens in Phase 9.');
            }}
            style={styles.modalActionButton}
          />
          <Text style={styles.modalFootnote}>
            Community safety and reporting tools will be fully activated in Phase 9.
          </Text>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 18,
  },
  navTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  moreButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  moreButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: spacing.xl,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  fullName: {
    ...typography.h1,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    marginVertical: 2,
  },
  username: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  bioCard: {
    backgroundColor: colors.surfaceSubtle,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  bioText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700',
    color: colors.accentDark,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginVertical: 2,
  },
  privacyNoticeContainer: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyNoticeText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  actionContainer: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  connectHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actionModalContent: {
    paddingVertical: spacing.md,
  },
  modalActionButton: {
    marginBottom: spacing.md,
  },
  modalFootnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
