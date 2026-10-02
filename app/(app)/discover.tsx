import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Modal } from '../../components/Modal';
import { SearchablePicker } from '../../components/SearchablePicker';
import { StudentCard } from '../../components/StudentCard';
import { ConnectModal } from '../../components/ConnectModal';
import { ErrorState, EmptyState, Skeleton } from '../../components/FeedbackStates';
import { useAuth } from '../../features/auth';
import { onboardingService } from '../../features/onboarding';
import {
  useDiscover,
  DiscoverFilters,
  DiscoverSortOption,
  StudentRecommendation,
} from '../../features/discover';
import { City, College, Course, Branch } from '../../types/database';

const SORT_OPTIONS: { label: string; value: DiscoverSortOption }[] = [
  { label: 'Highest Relevance', value: 'relevance' },
  { label: 'Same Hometown First', value: 'same_hometown' },
  { label: 'Same College First', value: 'same_college' },
  { label: 'Same Course First', value: 'same_course' },
  { label: 'Same Branch First', value: 'same_branch' },
  { label: 'Mutual Connections First', value: 'mutual_connections' },
];

const AVAILABLE_INTERESTS = [
  'Coding & Web Dev',
  'AI / Machine Learning',
  'Competitive Programming',
  'Robotics & IoT',
  'Cricket',
  'Football',
  'Badminton',
  'Music & Jamming',
  'Photography',
  'Debating & MUN',
  'Startups & Entrepreneurship',
  'Gaming & Esports',
  'Reading & Literature',
  'Finance & Investing',
];

const AVAILABLE_SKILLS_TO_TEACH = [
  'Python',
  'C / C++',
  'Java',
  'React / React Native',
  'Data Structures & Algorithms',
  'Machine Learning Basics',
  'Mathematics for Engineering',
  'Graphic Design (Canva/Figma)',
  'Video Editing (Premiere/CapCut)',
  'Aptitude & Placement Prep',
  'Guitar / Keyboard',
  'Spoken English & Communication',
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  // Search input state
  const [searchInput, setSearchInput] = useState('');

  // Filter state
  const [filters, setFilters] = useState<DiscoverFilters>({
    sortBy: 'relevance',
    expandNcr: false,
  });

  // Filter Modal visibility
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // Connect Modal state
  const [connectTarget, setConnectTarget] = useState<StudentRecommendation | null>(null);

  // Metadata tables for filter pickers
  const [cities, setCities] = useState<City[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [c, col, cr, br] = await Promise.all([
          onboardingService.getCities(),
          onboardingService.getColleges(),
          onboardingService.getCourses(),
          onboardingService.getBranches(),
        ]);
        setCities(c);
        setColleges(col);
        setCourses(cr);
        setBranches(br);
      } catch (err) {
        console.warn('Failed to load filter metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // React Query hook with 300ms debounce & keyset pagination
  const {
    students,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useDiscover(filters, searchInput);

  // Helpers to resolve entity names for active chips
  const homeCityName = useMemo(
    () => cities.find((c) => c.id === filters.homeCityId)?.name,
    [cities, filters.homeCityId]
  );
  const currentCityName = useMemo(
    () => cities.find((c) => c.id === filters.currentCityId)?.name,
    [cities, filters.currentCityId]
  );
  const collegeName = useMemo(
    () => colleges.find((col) => col.id === filters.collegeId)?.short_name || colleges.find((col) => col.id === filters.collegeId)?.name,
    [colleges, filters.collegeId]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.homeCityId) count++;
    if (filters.currentCityId) count++;
    if (filters.collegeId) count++;
    if (filters.courseId) count++;
    if (filters.branchId) count++;
    if (filters.yearOfStudy) count++;
    if (filters.interest) count++;
    if (filters.skill) count++;
    if (filters.expandNcr) count++;
    if (filters.sortBy && filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  const handleCardPress = (student: StudentRecommendation) => {
    router.push(`/(app)/students/${student.id}` as Href);
  };

  const handleToggleNcr = () => {
    setFilters((prev) => ({
      ...prev,
      expandNcr: !prev.expandNcr,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      sortBy: 'relevance',
      expandNcr: false,
    });
    setSearchInput('');
  };

  const renderItem = ({ item }: { item: StudentRecommendation }) => (
    <StudentCard
      student={item}
      onPress={() => handleCardPress(item)}
      onConnectPress={() => setConnectTarget(item)}
      showConnectButton={true}
    />
  );

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerLoaderText}>Loading more peers...</Text>
        </View>
      );
    }
    if (hasNextPage) {
      return (
        <View style={styles.footerButtonContainer}>
          <Button
            title="Load More Students"
            variant="outline"
            size="sm"
            onPress={() => fetchNextPage()}
          />
        </View>
      );
    }
    if (students.length > 0) {
      return (
        <View style={styles.footerFinished}>
          <Text style={styles.footerFinishedText}>✓ You've seen all matching peers</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    const userHomeName = profile?.home_city_id
      ? cities.find((c) => c.id === profile.home_city_id)?.name
      : undefined;
    const userCurrentName = profile?.current_city_id
      ? cities.find((c) => c.id === profile.current_city_id)?.name
      : undefined;

    const emptyTitle = filters.homeCityId || userHomeName
      ? `No students from ${homeCityName || userHomeName || 'your city'} found in ${currentCityName || userCurrentName || 'this campus'} yet`
      : 'No matching students found';

    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          title={emptyTitle}
          description={
            filters.expandNcr
              ? 'Try clearing specific course or branch filters to find peers nearby.'
              : 'Broaden your search to campuses across the National Capital Region (NCR).'
          }
          actionText={filters.expandNcr ? 'Reset All Filters' : 'Try expanding to NCR 🏙️'}
          onAction={() => {
            if (filters.expandNcr) {
              handleResetFilters();
            } else {
              setFilters((prev) => ({ ...prev, expandNcr: true }));
            }
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            onPress={() => router.push('/(app)' as Href)}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <Text style={styles.backButtonText}>‹ Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discover Peers</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/(app)/requests' as Href)}
              style={styles.headerActionBtn}
            >
              <Text style={styles.headerActionText}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/connections' as Href)}
              style={styles.headerActionBtn}
            >
              <Text style={styles.headerActionText}>Connected</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 300ms Debounced Search Input */}
        <Input
          placeholder="Search by name, @username, or college..."
          value={searchInput}
          onChangeText={setSearchInput}
          containerStyle={styles.searchInput}
          accessibilityLabel="Search students input"
        />

        {/* Quick Filter Bar */}
        <View style={styles.quickFilterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFilterContent}
          >
            {/* Filter Drawer Trigger */}
            <TouchableOpacity
              onPress={() => setIsFilterModalOpen(true)}
              style={[
                styles.filterChip,
                activeFilterCount > 0 && styles.filterChipActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open filters"
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilterCount > 0 && styles.filterChipTextActive,
                ]}
              >
                ⚙️ Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>

            {/* Region Expander for NCR */}
            <TouchableOpacity
              onPress={handleToggleNcr}
              style={[
                styles.filterChip,
                filters.expandNcr && styles.filterChipActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle Expand to NCR"
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.expandNcr && styles.filterChipTextActive,
                ]}
              >
                🏙️ Expand to NCR {filters.expandNcr ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            {/* Sort Indicator Chip */}
            <TouchableOpacity
              onPress={() => setIsFilterModalOpen(true)}
              style={styles.filterChip}
            >
              <Text style={styles.filterChipText}>
                ↕️ {SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label.split(' ')[0] || 'Sort'}
              </Text>
            </TouchableOpacity>

            {/* Active chips with quick dismiss */}
            {homeCityName ? (
              <Chip
                label={`Home: ${homeCityName} ✕`}
                selected={true}
                onPress={() => setFilters((p) => ({ ...p, homeCityId: null }))}
              />
            ) : null}

            {currentCityName ? (
              <Chip
                label={`Campus: ${currentCityName} ✕`}
                selected={true}
                onPress={() => setFilters((p) => ({ ...p, currentCityId: null }))}
              />
            ) : null}

            {collegeName ? (
              <Chip
                label={`College: ${collegeName} ✕`}
                selected={true}
                onPress={() => setFilters((p) => ({ ...p, collegeId: null }))}
              />
            ) : null}

            {filters.yearOfStudy ? (
              <Chip
                label={`Year ${filters.yearOfStudy} ✕`}
                selected={true}
                onPress={() => setFilters((p) => ({ ...p, yearOfStudy: null }))}
              />
            ) : null}

            {filters.interest ? (
              <Chip
                label={`Interest: ${filters.interest} ✕`}
                selected={true}
                onPress={() => setFilters((p) => ({ ...p, interest: null }))}
              />
            ) : null}

            {filters.skill ? (
              <Chip
                label={`Skill: ${filters.skill} ✕`}
                selected={true}
                onPress={() => setFilters((p) => ({ ...p, skill: null }))}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>

      {/* Main Content Area */}
      {isError ? (
        <ErrorState
          message={error?.message || 'Unable to connect to the peer directory. Check your connection.'}
          onRetry={refetch}
        />
      ) : isLoading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton width="100%" height={160} borderRadius={radius.card} style={{ marginBottom: spacing.md }} />
          <Skeleton width="100%" height={160} borderRadius={radius.card} style={{ marginBottom: spacing.md }} />
          <Skeleton width="100%" height={160} borderRadius={radius.card} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Comprehensive Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        title="Refine Discover Filters"
        onClose={() => setIsFilterModalOpen(false)}
      >
        <ScrollView style={styles.modalScroll}>
          {/* Sort Selector */}
          <Text style={styles.filterSectionTitle}>SORT PEERS BY</Text>
          <View style={styles.sortChipsRow}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setFilters((p) => ({ ...p, sortBy: opt.value }))}
                style={[
                  styles.sortChip,
                  filters.sortBy === opt.value && styles.sortChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    filters.sortBy === opt.value && styles.sortChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Region Expansion Toggle */}
          <View style={styles.filterSection}>
            <TouchableOpacity
              style={[
                styles.ncrToggleCard,
                filters.expandNcr && styles.ncrToggleCardActive,
              ]}
              onPress={handleToggleNcr}
            >
              <Text style={styles.ncrToggleTitle}>🏙️ NCR Region Expander</Text>
              <Text style={styles.ncrToggleSubtitle}>
                {filters.expandNcr
                  ? 'Currently searching across all NCR campuses (Delhi, Noida, Greater Noida, Ghaziabad, Gurugram, Faridabad).'
                  : 'Expand search beyond a single city to include all NCR colleges.'}
              </Text>
              <Text style={[styles.ncrStatus, filters.expandNcr && styles.ncrStatusActive]}>
                {filters.expandNcr ? 'Active ✓' : 'Tap to Enable'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hometown Picker */}
          <View style={styles.filterSection}>
            <SearchablePicker
              label="Hometown (Origin City)"
              placeholder="Filter by hometown..."
              items={cities.map((c) => ({
                id: c.id,
                label: c.name,
                subtitle: c.state,
              }))}
              selectedId={filters.homeCityId || null}
              onSelect={(item) =>
                setFilters((p) => ({ ...p, homeCityId: item ? item.id : null }))
              }
            />
          </View>

          {/* Campus City Picker */}
          <View style={styles.filterSection}>
            <SearchablePicker
              label="Campus City"
              placeholder="Filter by college city..."
              items={cities.map((c) => ({
                id: c.id,
                label: c.name,
                subtitle: c.state,
              }))}
              selectedId={filters.currentCityId || null}
              onSelect={(item) =>
                setFilters((p) => ({ ...p, currentCityId: item ? item.id : null }))
              }
            />
          </View>

          {/* College Picker */}
          <View style={styles.filterSection}>
            <SearchablePicker
              label="College / University"
              placeholder="Filter by college..."
              items={colleges.map((col) => ({
                id: col.id,
                label: col.name,
                subtitle: col.short_name || undefined,
              }))}
              selectedId={filters.collegeId || null}
              onSelect={(item) =>
                setFilters((p) => ({ ...p, collegeId: item ? item.id : null }))
              }
            />
          </View>

          {/* Course Picker */}
          <View style={styles.filterSection}>
            <SearchablePicker
              label="Program / Degree"
              placeholder="Filter by degree..."
              items={courses.map((cr) => ({
                id: cr.id,
                label: cr.name,
              }))}
              selectedId={filters.courseId || null}
              onSelect={(item) =>
                setFilters((p) => ({ ...p, courseId: item ? item.id : null }))
              }
            />
          </View>

          {/* Branch Picker */}
          <View style={styles.filterSection}>
            <SearchablePicker
              label="Academic Branch / Stream"
              placeholder="Filter by branch..."
              items={branches.map((br) => ({
                id: br.id,
                label: br.name,
              }))}
              selectedId={filters.branchId || null}
              onSelect={(item) =>
                setFilters((p) => ({ ...p, branchId: item ? item.id : null }))
              }
            />
          </View>

          {/* Year of study selector */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>YEAR OF STUDY</Text>
            <View style={styles.sortChipsRow}>
              {[1, 2, 3, 4, 5].map((yr) => (
                <TouchableOpacity
                  key={yr}
                  onPress={() =>
                    setFilters((p) => ({
                      ...p,
                      yearOfStudy: p.yearOfStudy === yr ? null : yr,
                    }))
                  }
                  style={[
                    styles.sortChip,
                    filters.yearOfStudy === yr && styles.sortChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      filters.yearOfStudy === yr && styles.sortChipTextActive,
                    ]}
                  >
                    {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : `${yr}th Year`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interest Selector */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>SPECIFIC INTEREST</Text>
            <View style={styles.chipsRow}>
              {AVAILABLE_INTERESTS.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  selected={filters.interest === interest}
                  onPress={() =>
                    setFilters((p) => ({
                      ...p,
                      interest: p.interest === interest ? null : interest,
                    }))
                  }
                  style={styles.chipItem}
                />
              ))}
            </View>
          </View>

          {/* Skills Selector */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>SKILL TO TEACH</Text>
            <View style={styles.chipsRow}>
              {AVAILABLE_SKILLS_TO_TEACH.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  selected={filters.skill === skill}
                  onPress={() =>
                    setFilters((p) => ({
                      ...p,
                      skill: p.skill === skill ? null : skill,
                    }))
                  }
                  style={styles.chipItem}
                />
              ))}
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.modalActionRow}>
            <Button
              title="Reset All"
              variant="outline"
              size="md"
              onPress={handleResetFilters}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              title="Apply Filters"
              size="md"
              onPress={() => setIsFilterModalOpen(false)}
              style={{ flex: 1, marginLeft: spacing.sm }}
            />
          </View>
        </ScrollView>
      </Modal>

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
        onSuccess={() => refetch()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  headerActionText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  quickFilterBar: {
    marginVertical: spacing.xs,
  },
  quickFilterContent: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  skeletonContainer: {
    padding: spacing.lg,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerLoaderText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footerButtonContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  footerFinished: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  footerFinishedText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
  },
  modalScroll: {
    maxHeight: 520,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.accentDark,
    marginBottom: spacing.sm,
  },
  sortChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sortChipTextActive: {
    color: colors.textInverse,
  },
  ncrToggleCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ncrToggleCardActive: {
    backgroundColor: '#E8F0FE',
    borderColor: colors.primary,
  },
  ncrToggleTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  ncrToggleSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  ncrStatus: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },
  ncrStatusActive: {
    color: colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipItem: {
    marginVertical: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
