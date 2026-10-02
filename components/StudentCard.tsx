import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radius, typography, spacing, shadows } from '../constants/theme';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { StudentRecommendation } from '../features/discover/types';

interface StudentCardProps {
  student: StudentRecommendation;
  onPress: () => void;
  onConnectPress?: () => void;
  showConnectButton?: boolean;
  style?: ViewStyle;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onPress,
  onConnectPress,
  showConnectButton = true,
  style,
}) => {
  const getYearOrdinal = (yr: number | null) => {
    if (!yr) return '';
    return yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : `${yr}th Year`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${student.full_name}`}
    >
      {/* Top Header: Avatar + Identity */}
      <View style={styles.headerRow}>
        <Avatar
          name={student.full_name}
          url={student.avatar_url || undefined}
          size="md"
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName} numberOfLines={1}>
              {student.full_name}
            </Text>
            {student.is_verified ? (
              <Badge label="VERIFIED" variant="primary" style={styles.badgeMargin} />
            ) : null}
            {student.is_seed ? (
              <Badge label="DEMO" variant="warning" style={styles.badgeMargin} />
            ) : null}
          </View>
          {student.username ? (
            <Text style={styles.username}>@{student.username}</Text>
          ) : null}
        </View>
      </View>

      {/* Origin -> Campus City Flow Pill */}
      <View style={styles.cityPill}>
        <Text style={styles.cityPillText}>
          🏠 {student.home_city_name || 'Hometown'}
          <Text style={styles.arrowText}> ➔ </Text>
          📍 {student.current_city_name || 'Campus'}
        </Text>
      </View>

      {/* College & Academic info */}
      <View style={styles.academicSection}>
        <Text style={styles.collegeName} numberOfLines={1}>
          🎓 {student.college_name || 'College'}
        </Text>
        <Text style={styles.academicDetails} numberOfLines={1}>
          {[
            student.course_name,
            student.branch_name,
            getYearOrdinal(student.year_of_study),
          ]
            .filter(Boolean)
            .join(' • ')}
        </Text>
      </View>

      {/* Bio snippet if available */}
      {student.bio ? (
        <Text style={styles.bioSnippet} numberOfLines={2}>
          "{student.bio}"
        </Text>
      ) : null}

      {/* Why This Match? Chips */}
      {student.match_reasons && student.match_reasons.length > 0 ? (
        <View style={styles.matchSection}>
          <Text style={styles.matchSectionLabel}>WHY THIS MATCH</Text>
          <View style={styles.matchChipsContainer}>
            {student.match_reasons.map((reason, idx) => (
              <View key={`${reason}-${idx}`} style={styles.matchChip}>
                <Text style={styles.matchChipText}>✓ {reason}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Mutual connections count */}
      {student.mutual_connections_count > 0 ? (
        <Text style={styles.mutualText}>
          👥 {student.mutual_connections_count} mutual connection{student.mutual_connections_count > 1 ? 's' : ''}
        </Text>
      ) : null}

      {/* Connect button - Activated in Phase 3 */}
      {showConnectButton ? (
        <View style={styles.connectRow}>
          <Button
            title="Connect"
            variant="outline"
            size="sm"
            disabled={!onConnectPress}
            onPress={() => {
              onConnectPress?.();
            }}
            style={styles.connectButton}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  fullName: {
    ...typography.h3,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  badgeMargin: {
    marginLeft: spacing.xs,
    marginVertical: 2,
  },
  username: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  cityPill: {
    backgroundColor: colors.surfaceSubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  cityPillText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  arrowText: {
    color: colors.primary,
    fontWeight: '800',
  },
  academicSection: {
    marginBottom: spacing.sm,
  },
  collegeName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  academicDetails: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bioSnippet: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  matchSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  matchSectionLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.accentDark,
    marginBottom: spacing.xs,
  },
  matchChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  matchChip: {
    backgroundColor: '#E6F4EA', // Light soft green match pill
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  matchChipText: {
    ...typography.caption,
    fontSize: 11,
    color: '#137333',
    fontWeight: '600',
  },
  mutualText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  connectRow: {
    marginTop: spacing.md,
    alignItems: 'flex-end',
  },
  connectButton: {
    width: 110,
  },
});
