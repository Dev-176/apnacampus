import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing } from '../../constants/theme';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StudentCard } from '../../components/StudentCard';
import { ConnectModal } from '../../components/ConnectModal';
import { Skeleton, EmptyState } from '../../components/FeedbackStates';
import { useAuth } from '../../features/auth';
import { onboardingService } from '../../features/onboarding';
import { useHometownPeers, StudentRecommendation } from '../../features/discover';
import { City, College, Course, Branch } from '../../types/database';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();

  const [homeCity, setHomeCity] = useState<City | null>(null);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectTarget, setConnectTarget] = useState<StudentRecommendation | null>(null);

  // Load metadata for current user's identity card
  const loadProfileDetails = useCallback(async () => {
    try {
      const [cities, colleges, courses, branches] = await Promise.all([
        onboardingService.getCities(),
        onboardingService.getColleges(),
        onboardingService.getCourses(),
        onboardingService.getBranches(),
      ]);

      if (profile?.home_city_id) {
        setHomeCity(cities.find((c) => c.id === profile.home_city_id) || null);
      }
      if (profile?.current_city_id) {
        setCurrentCity(cities.find((c) => c.id === profile.current_city_id) || null);
      }
      if (profile?.college_id) {
        setCollege(colleges.find((col) => col.id === profile.college_id) || null);
      }
      if (profile?.course_id) {
        setCourse(courses.find((cr) => cr.id === profile.course_id) || null);
      }
      if (profile?.branch_id) {
        setBranch(branches.find((b) => b.id === profile.branch_id) || null);
      }
    } catch (err) {
      console.warn('Error loading profile metadata:', err);
    }
  }, [profile]);

  useEffect(() => {
    loadProfileDetails();
  }, [loadProfileDetails]);

  // Query hometown peers (Phase 2)
  const {
    data: hometownPeers = [],
    isLoading: isLoadingPeers,
    refetch: refetchPeers,
  } = useHometownPeers(profile?.home_city_id);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), loadProfileDetails(), refetchPeers()]);
    setRefreshing(false);
  };

  const getYearOrdinal = (yr: number | null) => {
    if (!yr) return '';
    return yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : `${yr}th`;
  };

  const handlePeerPress = (peer: StudentRecommendation) => {
    router.push(`/(app)/students/${peer.id}` as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>
              Hey, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
            </Text>
            <Text style={styles.tagline}>"Apne Shehar Se, Apne Campus Tak."</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/profile' as Href)}
            accessibilityRole="button"
            accessibilityLabel="View Profile"
          >
            <Avatar name={profile?.full_name || 'Student'} size="md" />
          </TouchableOpacity>
        </View>

        {/* Discover peers CTA Bar */}
        <TouchableOpacity
          style={styles.discoverBanner}
          onPress={() => router.push('/(app)/discover' as Href)}
          activeOpacity={0.8}
        >
          <View style={styles.discoverBannerContent}>
            <Text style={styles.discoverBannerIcon}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.discoverBannerTitle}>Discover Students & Peers</Text>
              <Text style={styles.discoverBannerSubtitle}>
                Search by college, hometown, course, or shared skills
              </Text>
            </View>
            <Text style={styles.discoverBannerArrow}>➔</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Connection & Chat Links */}
        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push('/(app)/messages' as Href)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickLinkIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickLinkTitle}>Messages</Text>
              <Text style={styles.quickLinkSubtitle}>Direct Chats</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push('/(app)/connections' as Href)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickLinkIcon}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickLinkTitle}>Connections</Text>
              <Text style={styles.quickLinkSubtitle}>My Network</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push('/(app)/requests' as Href)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickLinkIcon}>📬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickLinkTitle}>Requests</Text>
              <Text style={styles.quickLinkSubtitle}>Incoming</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Student Identity Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{profile?.full_name}</Text>
              {profile?.username ? (
                <Text style={styles.studentUsername}>@{profile.username}</Text>
              ) : null}
            </View>
            {profile?.is_verified ? (
              <Badge label="VERIFIED STUDENT" variant="primary" />
            ) : null}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏠</Text>
            <Text style={styles.detailText}>
              Hometown: <Text style={styles.detailValue}>{homeCity?.name || 'Not set'}</Text>
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>
              Studying in:{' '}
              <Text style={styles.detailValue}>{currentCity?.name || 'Not set'}</Text>
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🎓</Text>
            <Text style={styles.detailText}>
              {college?.name || 'College not selected'}
            </Text>
          </View>

          <View style={styles.academicPill}>
            <Text style={styles.academicText}>
              {course?.name || 'Course'}
              {branch ? ` • ${branch.name}` : ''}
              {profile?.year_of_study ? ` • ${getYearOrdinal(profile.year_of_study)} Year` : ''}
            </Text>
          </View>

          {profile?.bio ? (
            <Text style={styles.bioText}>"{profile.bio}"</Text>
          ) : null}

          <Button
            title="Edit My Profile"
            variant="outline"
            size="sm"
            onPress={() => router.push('/(app)/profile' as Href)}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {/* Section: Students from {homeCity} */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Students from {homeCity?.name || 'Your Hometown'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Peers from {homeCity?.name || 'home'} studying nearby
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/discover' as Href)}
            accessibilityRole="button"
            accessibilityLabel="See all students"
          >
            <Text style={styles.seeAllText}>See all ➔</Text>
          </TouchableOpacity>
        </View>

        {isLoadingPeers ? (
          <View style={styles.peersLoaderContainer}>
            <Skeleton width="100%" height={140} borderRadius={radius.card} style={{ marginBottom: spacing.md }} />
            <Skeleton width="100%" height={140} borderRadius={radius.card} />
          </View>
        ) : hometownPeers.length > 0 ? (
          <View style={styles.peersContainer}>
            {hometownPeers.map((peer) => (
              <StudentCard
                key={peer.id}
                student={peer}
                onPress={() => handlePeerPress(peer)}
                onConnectPress={() => setConnectTarget(peer)}
                showConnectButton={true}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyPeersCard}>
            <EmptyState
              title={`No peers from ${homeCity?.name || 'your city'} found yet`}
              description="Be the first from your city, or discover students from across NCR campuses!"
              actionText="Explore Discover 🔍"
              onAction={() => router.push('/(app)/discover' as Href)}
            />
          </Card>
        )}

        {/* Teaser 1: Communities (Phase 5) */}
        <View style={styles.teaserSection}>
          <View style={styles.teaserHeaderRow}>
            <Text style={styles.teaserSectionTitle}>🏘️ Campus & City Circles</Text>
            <Badge label="COMING IN PHASE 5" variant="neutral" />
          </View>
          <Card style={styles.teaserCard}>
            <Text style={styles.teaserCardTitle}>
              Connect with your campus community & local clubs
            </Text>
            <Text style={styles.teaserCardDescription}>
              Join moderated college channels, student city chapters, and hostel discussions to stay in the loop.
            </Text>
            <Button
              title="Explore Circles"
              variant="outline"
              size="sm"
              disabled={true}
              onPress={() => {
                // TODO(phase-5): Communities
              }}
              style={styles.teaserButton}
            />
          </Card>
        </View>

        {/* Teaser 2: Study Help (Phase 6) */}
        <View style={styles.teaserSection}>
          <View style={styles.teaserHeaderRow}>
            <Text style={styles.teaserSectionTitle}>📚 Peer Study & Doubt Sharing</Text>
            <Badge label="COMING IN PHASE 6" variant="neutral" />
          </View>
          <Card style={styles.teaserCard}>
            <Text style={styles.teaserCardTitle}>
              Find study partners & past year question papers
            </Text>
            <Text style={styles.teaserCardDescription}>
              Share semester notes, discuss lab assignments, and learn new skills from senior peers.
            </Text>
            <Button
              title="Ask a Doubt"
              variant="outline"
              size="sm"
              disabled={true}
              onPress={() => {
                // TODO(phase-6): Study Help
              }}
              style={styles.teaserButton}
            />
          </Card>
        </View>

        {/* Teaser 3: Travel Coordination (Phase 7) */}
        <View style={styles.teaserSection}>
          <View style={styles.teaserHeaderRow}>
            <Text style={styles.teaserSectionTitle}>🚗 Going Home Together</Text>
            <Badge label="COMING IN PHASE 7" variant="neutral" />
          </View>
          <Card style={styles.teaserCard}>
            <Text style={styles.teaserCardTitle}>
              Festival & weekend travel buddy coordination
            </Text>
            <Text style={styles.teaserCardDescription}>
              Split cab fares to the railway station or travel together back to {homeCity?.name || 'hometown'} during Diwali and semester breaks.
            </Text>
            <Button
              title="Find Travel Buddies"
              variant="outline"
              size="sm"
              disabled={true}
              onPress={() => {
                // TODO(phase-7): Travel Coordination
              }}
              style={styles.teaserButton}
            />
          </Card>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomNavSection}>
          <Button
            title="🔍 Open Discover Directory"
            size="md"
            onPress={() => router.push('/(app)/discover' as Href)}
            style={{ marginBottom: spacing.md }}
          />
          <Button
            title="Sign Out"
            variant="danger"
            size="sm"
            onPress={signOut}
          />
        </View>
      </ScrollView>

      {/* Connect Bottom Sheet Modal */}
      <ConnectModal
        visible={Boolean(connectTarget)}
        targetStudent={
          connectTarget
            ? {
                id: connectTarget.id,
                fullName: connectTarget.full_name,
                homeCityName: connectTarget.home_city_name,
                currentCityName: connectTarget.current_city_name,
                collegeName: connectTarget.college_name,
              }
            : null
        }
        onClose={() => setConnectTarget(null)}
        onSuccess={() => refetchPeers()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  welcomeText: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '800',
  },
  tagline: {
    ...typography.caption,
    color: colors.accentDark,
    fontStyle: 'italic',
    marginTop: 2,
  },
  discoverBanner: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1.5,
    borderColor: '#C2E7FF',
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  discoverBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverBannerIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  discoverBannerTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  discoverBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  discoverBannerArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLinkIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  quickLinkTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickLinkSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  profileCard: {
    marginBottom: spacing.xxl,
  },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  studentName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  studentUsername: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  academicPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  academicText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  bioText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seeAllText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  peersLoaderContainer: {
    marginBottom: spacing.xl,
  },
  peersContainer: {
    marginBottom: spacing.xl,
  },
  emptyPeersCard: {
    marginBottom: spacing.xl,
  },
  teaserSection: {
    marginBottom: spacing.xl,
  },
  teaserHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teaserSectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  teaserCard: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  teaserCardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  teaserCardDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  teaserButton: {
    alignSelf: 'flex-start',
  },
  bottomNavSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
