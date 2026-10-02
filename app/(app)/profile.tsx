import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { SearchablePicker } from '../../components/SearchablePicker';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../features/auth';
import { onboardingService } from '../../features/onboarding';
import { City, College, Course, Branch } from '../../types/database';

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

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [homeCityId, setHomeCityId] = useState<string | null>(profile?.home_city_id || null);
  const [currentCityId, setCurrentCityId] = useState<string | null>(profile?.current_city_id || null);
  const [collegeId, setCollegeId] = useState<string | null>(profile?.college_id || null);
  const [courseId, setCourseId] = useState<string | null>(profile?.course_id || null);
  const [branchId, setBranchId] = useState<string | null>(profile?.branch_id || null);
  const [yearOfStudy, setYearOfStudy] = useState<number>(profile?.year_of_study || 1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests || []);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skills_to_teach || []);

  const [cities, setCities] = useState<City[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      onboardingService.getCities(),
      onboardingService.getColleges(),
      onboardingService.getCourses(),
      onboardingService.getBranches(),
    ]).then(([c, col, cour, b]) => {
      setCities(c);
      setColleges(col);
      setCourses(cour);
      setBranches(b);
    });
  }, []);

  useEffect(() => {
    if (courseId) {
      onboardingService.getBranches(courseId).then((b) => setBranches(b));
    }
  }, [courseId]);

  const toggleInterest = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== item));
    } else {
      if (selectedInterests.length >= 6) {
        Alert.alert('Limit Reached', 'You can select up to 6 interests.');
        return;
      }
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  const toggleSkill = (item: string) => {
    if (selectedSkills.includes(item)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== item));
    } else {
      if (selectedSkills.length >= 6) {
        Alert.alert('Limit Reached', 'You can select up to 6 skills to teach.');
        return;
      }
      setSelectedSkills([...selectedSkills, item]);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessBanner(false);

    try {
      await onboardingService.updateMyProfile({
        full_name: fullName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        home_city_id: homeCityId,
        current_city_id: currentCityId,
        college_id: collegeId,
        course_id: courseId,
        branch_id: branchId,
        year_of_study: yearOfStudy,
        interests: selectedInterests,
        skills_to_teach: selectedSkills,
      });

      await refreshProfile();
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Success / Error Banners */}
          {successBanner && (
            <View style={styles.successBanner} accessibilityRole="alert">
              <Text style={styles.successBannerText}>Profile updated successfully! 🎉</Text>
            </View>
          )}

          {errorMessage && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Identity Section */}
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <Avatar name={fullName || 'Student'} size="xl" />
            </View>

            <Input
              label="Full Name *"
              value={fullName}
              onChangeText={setFullName}
            />

            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              inputStyle={{ height: 80, textAlignVertical: 'top' }}
            />
          </View>

          {/* Location & College Section */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Hometown & Campus 📍</Text>

            <SearchablePicker
              label="Hometown / Home City *"
              items={cities.map((c) => ({
                id: c.id,
                label: c.name,
                sublabel: c.state,
              }))}
              selectedId={homeCityId}
              onSelect={(item) => setHomeCityId(item.id)}
            />

            <SearchablePicker
              label="Current Campus City *"
              items={cities.map((c) => ({
                id: c.id,
                label: c.name,
                sublabel: c.state,
              }))}
              selectedId={currentCityId}
              onSelect={(item) => {
                setCurrentCityId(item.id);
                setCollegeId(null);
              }}
            />

            <SearchablePicker
              label="College / University *"
              items={colleges
                .filter((col) => !currentCityId || col.city_id === currentCityId)
                .map((col) => ({
                  id: col.id,
                  label: col.name,
                  sublabel: col.short_name || undefined,
                }))}
              selectedId={collegeId}
              onSelect={(item) => setCollegeId(item.id)}
            />
          </View>

          {/* Academic Details Section */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Academic Info 🎓</Text>

            <SearchablePicker
              label="Course / Degree *"
              items={courses.map((cr) => ({
                id: cr.id,
                label: cr.name,
                sublabel: `${cr.duration_years} Years`,
              }))}
              selectedId={courseId}
              onSelect={(item) => {
                setCourseId(item.id);
                setBranchId(null);
              }}
            />

            {branches.length > 0 && (
              <SearchablePicker
                label="Branch / Specialization"
                items={branches.map((b) => ({
                  id: b.id,
                  label: b.name,
                }))}
                selectedId={branchId}
                onSelect={(item) => setBranchId(item.id)}
              />
            )}

            <Text style={styles.fieldLabel}>Year of Study</Text>
            <View style={styles.yearRow}>
              {[1, 2, 3, 4, 5].map((yr) => (
                <TouchableOpacity
                  key={yr}
                  activeOpacity={0.8}
                  onPress={() => setYearOfStudy(yr)}
                  style={[
                    styles.yearButton,
                    yearOfStudy === yr && styles.yearButtonSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: yearOfStudy === yr }}
                  accessibilityLabel={`Year ${yr}`}
                >
                  <Text
                    style={[
                      styles.yearButtonText,
                      yearOfStudy === yr && styles.yearButtonTextSelected,
                    ]}
                  >
                    {yr}{yr === 1 ? 'st' : yr === 2 ? 'nd' : yr === 3 ? 'rd' : 'th'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interests & Skills */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Interests (Max 6)</Text>
            <View style={styles.chipsRow}>
              {AVAILABLE_INTERESTS.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  selected={selectedInterests.includes(interest)}
                  onPress={() => toggleInterest(interest)}
                />
              ))}
            </View>

            <Text style={[styles.cardSectionTitle, { marginTop: spacing.lg }]}>
              Skills to Teach (Max 6)
            </Text>
            <View style={styles.chipsRow}>
              {AVAILABLE_SKILLS_TO_TEACH.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  selected={selectedSkills.includes(skill)}
                  onPress={() => toggleSkill(skill)}
                />
              ))}
            </View>
          </View>

          {/* Save Button */}
          <Button
            title="Save Changes"
            loading={saving}
            onPress={handleSaveProfile}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    minHeight: 48,
    justifyContent: 'center',
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  successBanner: {
    backgroundColor: colors.successBackground,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  successBannerText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginBottom: spacing.xl,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cardSectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  yearButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  yearButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  yearButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  yearButtonTextSelected: {
    color: colors.textInverse,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  saveButton: {
    width: '100%',
    marginTop: spacing.xs,
  },
});
