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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { colors, radius, typography, spacing, shadows } from '../constants/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SearchablePicker } from '../components/SearchablePicker';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../features/auth';
import { onboardingService } from '../features/onboarding';
import { City, College, Course, Branch } from '../types/database';

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

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  // Step 1 to 5
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
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

  // Lookup data from DB
  const [cities, setCities] = useState<City[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Suggest College Modal
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestedCollegeName, setSuggestedCollegeName] = useState('');
  const [suggestedCollegeCity, setSuggestedCollegeCity] = useState('');
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load lookup data on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      onboardingService.getCities(),
      onboardingService.getColleges(),
      onboardingService.getCourses(),
      onboardingService.getBranches(),
    ])
      .then(([c, col, cour, b]) => {
        if (!isMounted) return;
        setCities(c);
        setColleges(col);
        setCourses(cour);
        setBranches(b);
      })
      .catch((err) => {
        console.warn('Failed to load lookup tables:', err);
        setErrorMessage('Failed to load colleges and cities. Please check your connection.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch branches when courseId changes
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

  const handleCollegeSuggestion = async () => {
    if (!suggestedCollegeName.trim() || !suggestedCollegeCity.trim()) {
      Alert.alert('Required', 'Please enter both the college name and city.');
      return;
    }

    setSuggestionSubmitting(true);
    try {
      await onboardingService.submitCollegeSuggestion({
        collegeName: suggestedCollegeName,
        cityName: suggestedCollegeCity,
      });
      setSuggestionModalVisible(false);
      setSuggestedCollegeName('');
      setSuggestedCollegeCity('');
      Alert.alert(
        'Suggestion Received',
        'Thank you! Our moderators will review and add your college shortly.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not submit suggestion.';
      Alert.alert('Submission Error', msg);
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  const saveCurrentProgress = async (nextStep: number, isFinal: boolean = false) => {
    setSavingStep(true);
    setErrorMessage(null);

    try {
      await onboardingService.updateMyProfile({
        full_name: fullName.trim() || 'Student',
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
        is_onboarded: isFinal ? true : profile?.is_onboarded || false,
      });

      await refreshProfile();

      if (isFinal) {
        router.replace('/(app)' as Href);
      } else {
        setCurrentStep(nextStep);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save progress. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSavingStep(false);
    }
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return false;
      }
    }
    if (step === 2) {
      if (!homeCityId) {
        setErrorMessage('Please select your hometown / home city.');
        return false;
      }
    }
    if (step === 3) {
      if (!currentCityId) {
        setErrorMessage('Please select the city where you are currently studying.');
        return false;
      }
      if (!collegeId) {
        setErrorMessage('Please select your college.');
        return false;
      }
    }
    if (step === 4) {
      if (!courseId) {
        setErrorMessage('Please select your academic course.');
        return false;
      }
    }
    setErrorMessage(null);
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    saveCurrentProgress(currentStep + 1, false);
  };

  const handleComplete = () => {
    if (!validateStep(currentStep)) return;
    saveCurrentProgress(currentStep, true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading colleges and cities...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wizard Header & Step Indicator */}
          <View style={styles.header}>
            <Text style={styles.stepCounter}>STEP {currentStep} OF 5</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentStep / 5) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tell Us About Yourself</Text>
              <Text style={styles.cardSubtitle}>
                This helps peers from your hometown recognize and trust you.
              </Text>

              <View style={styles.avatarPreview}>
                <Avatar name={fullName || 'Student'} size="xl" />
              </View>

              <Input
                label="Full Name *"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChangeText={setFullName}
              />

              <Input
                label="Username (Optional)"
                placeholder="e.g. rahul_up"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <Input
                label="Short Bio"
                placeholder="e.g. 1st year CSE student from Aligarh, love coding & cricket!"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                inputStyle={{ height: 80, textAlignVertical: 'top' }}
              />
            </View>
          )}

          {/* STEP 2: Hometown */}
          {currentStep === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Where is Your Hometown? 🏠</Text>
              <Text style={styles.cardSubtitle}>
                ApnaCampus helps you find other students from your hometown studying nearby.
              </Text>

              <SearchablePicker
                label="Select Hometown / Home City *"
                placeholder="Search your home city..."
                items={cities.map((c) => ({
                  id: c.id,
                  label: c.name,
                  sublabel: `${c.state}${c.is_popular_hometown ? ' • Popular' : ''}`,
                }))}
                selectedId={homeCityId}
                onSelect={(item) => setHomeCityId(item.id)}
              />

              <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>💡 Privacy Notice</Text>
                <Text style={styles.tipText}>
                  We only show your hometown city. We never ask for or share your continuous GPS coordinates, street address, or live location.
                </Text>
              </View>
            </View>
          )}

          {/* STEP 3: Current City & College */}
          {currentStep === 3 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Where Do You Study? 📍</Text>
              <Text style={styles.cardSubtitle}>
                Select the campus city and your college or university.
              </Text>

              <SearchablePicker
                label="Current Campus City *"
                placeholder="e.g. Greater Noida, Delhi NCR, Lucknow"
                items={cities.map((c) => ({
                  id: c.id,
                  label: c.name,
                  sublabel: c.state,
                }))}
                selectedId={currentCityId}
                onSelect={(item) => {
                  setCurrentCityId(item.id);
                  setCollegeId(null); // Reset college when city changes
                }}
              />

              <SearchablePicker
                label="College / University *"
                placeholder="Search your college..."
                items={colleges
                  .filter((col) => !currentCityId || col.city_id === currentCityId)
                  .map((col) => ({
                    id: col.id,
                    label: col.name,
                    sublabel: col.short_name || undefined,
                  }))}
                selectedId={collegeId}
                onSelect={(item) => setCollegeId(item.id)}
                customActionText="My college isn't listed"
                onCustomActionPress={() => setSuggestionModalVisible(true)}
              />
            </View>
          )}

          {/* STEP 4: Course, Branch & Year */}
          {currentStep === 4 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Academic Details 🎓</Text>
              <Text style={styles.cardSubtitle}>
                Connect with peers studying the same subjects or courses.
              </Text>

              <SearchablePicker
                label="Course / Degree *"
                placeholder="Select your degree (e.g. B.Tech, BCA, MBBS)"
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
                  label="Branch / Specialization (Optional)"
                  placeholder="Select branch (e.g. CSE, ECE, Mechanical)"
                  items={branches.map((b) => ({
                    id: b.id,
                    label: b.name,
                  }))}
                  selectedId={branchId}
                  onSelect={(item) => setBranchId(item.id)}
                />
              )}

              <Text style={styles.fieldLabel}>Current Year of Study</Text>
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
                      {yr}{yr === 1 ? 'st' : yr === 2 ? 'nd' : yr === 3 ? 'rd' : 'th'} Yr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 5: Interests & Skills */}
          {currentStep === 5 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Interests & Peer Help 🤝</Text>
              <Text style={styles.cardSubtitle}>
                Select topics you enjoy and skills you can teach fellow students.
              </Text>

              <Text style={styles.sectionHeading}>Your Interests (Up to 6)</Text>
              <View style={styles.chipsContainer}>
                {AVAILABLE_INTERESTS.map((interest) => (
                  <Chip
                    key={interest}
                    label={interest}
                    selected={selectedInterests.includes(interest)}
                    onPress={() => toggleInterest(interest)}
                  />
                ))}
              </View>

              <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>
                Skills You Can Teach (Up to 6)
              </Text>
              <View style={styles.chipsContainer}>
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
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonRow}>
            {currentStep > 1 && (
              <Button
                title="Back"
                variant="outline"
                onPress={() => setCurrentStep(currentStep - 1)}
                style={styles.backStepButton}
                disabled={savingStep}
              />
            )}

            {currentStep < 5 ? (
              <Button
                title="Save & Continue"
                loading={savingStep}
                onPress={handleNext}
                style={styles.nextStepButton}
              />
            ) : (
              <Button
                title="Complete Onboarding"
                loading={savingStep}
                onPress={handleComplete}
                style={styles.nextStepButton}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* College Suggestion Modal */}
      <Modal
        visible={suggestionModalVisible}
        title="Suggest Your College"
        onClose={() => setSuggestionModalVisible(false)}
      >
        <Text style={styles.modalDescription}>
          Can't find your college? Submit the name and city, and our moderators will review and add it to the verified database.
        </Text>

        <Input
          label="College Name"
          placeholder="e.g. Gautam Buddha University"
          value={suggestedCollegeName}
          onChangeText={setSuggestedCollegeName}
        />

        <Input
          label="City / Campus Location"
          placeholder="e.g. Greater Noida"
          value={suggestedCollegeCity}
          onChangeText={setSuggestedCollegeCity}
        />

        <Button
          title="Submit College Suggestion"
          loading={suggestionSubmitting}
          onPress={handleCollegeSuggestion}
          style={{ marginTop: spacing.sm }}
        />
      </Modal>
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
  header: {
    marginBottom: spacing.xl,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
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
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tipBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  tipText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  sectionHeading: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backStepButton: {
    flex: 1,
  },
  nextStepButton: {
    flex: 2,
  },
  modalDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
});
