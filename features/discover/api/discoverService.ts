import { supabase } from '../../../lib/supabase';
import {
  DiscoverFilters,
  PublicStudentProfile,
  StudentRecommendation,
} from '../types';

export const discoverService = {
  /**
   * Fetch recommended student candidates using keyset cursor pagination and scoring RPC
   */
  async getRecommendations(
    filters: DiscoverFilters & { limit?: number; cursor?: string | null } = {}
  ): Promise<StudentRecommendation[]> {
    const {
      limit = 10,
      cursor = null,
      homeCityId = null,
      currentCityId = null,
      collegeId = null,
      courseId = null,
      branchId = null,
      yearOfStudy = null,
      interest = null,
      skill = null,
      search = null,
      sortBy = 'relevance',
      expandNcr = false,
    } = filters;

    // When expand to NCR is enabled, clear the single current city filter and set region to NCR
    const effectiveCurrentCityId = expandNcr ? null : currentCityId;
    const effectiveRegion = expandNcr ? 'NCR' : null;

    const { data, error } = await supabase.rpc('recommend_students', {
      p_limit: limit,
      p_cursor: cursor,
      p_home_city_id: homeCityId,
      p_current_city_id: effectiveCurrentCityId,
      p_college_id: collegeId,
      p_course_id: courseId,
      p_branch_id: branchId,
      p_year_of_study: yearOfStudy,
      p_interest: interest,
      p_skill: skill,
      p_search: search && search.trim().length > 0 ? search.trim() : null,
      p_sort_by: sortBy,
      p_region: effectiveRegion,
    });

    if (error) {
      console.error('Error fetching student recommendations:', error);
      throw new Error(error.message || 'Failed to load recommendations');
    }

    return (data || []) as StudentRecommendation[];
  },

  /**
   * Fetch home city peers for the Home screen carousel/section
   */
  async getHometownPeers(
    homeCityId: string,
    limit: number = 6
  ): Promise<StudentRecommendation[]> {
    return this.getRecommendations({
      homeCityId,
      limit,
      sortBy: 'same_hometown',
    });
  },

  /**
   * Fetch public student profile by ID
   * DPDP Act Compliance: Strictly excludes email, phone number, DOB, and private settings.
   * Excludes inactive, suspended, banned, or hidden profiles.
   */
  async getPublicStudentProfile(studentId: string): Promise<PublicStudentProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        username,
        avatar_url,
        bio,
        year_of_study,
        interests,
        skills_to_teach,
        is_verified,
        is_seed,
        home_city:cities!home_city_id (id, name, state, region),
        current_city:cities!current_city_id (id, name, state, region),
        college:colleges!college_id (id, name, short_name),
        course:courses!course_id (id, name),
        branch:branches!branch_id (id, name)
      `)
      .eq('id', studentId)
      .eq('is_active', true)
      .eq('is_suspended', false)
      .eq('is_banned', false)
      .eq('visibility', 'discoverable')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found or inaccessible due to RLS
        return null;
      }
      console.error('Error fetching public student profile:', error);
      throw new Error(error.message || 'Failed to load profile');
    }

    if (!data) return null;

    return {
      id: data.id,
      full_name: data.full_name,
      username: data.username,
      avatar_url: data.avatar_url,
      bio: data.bio,
      year_of_study: data.year_of_study,
      interests: data.interests || [],
      skills_to_teach: data.skills_to_teach || [],
      is_verified: data.is_verified,
      is_seed: data.is_seed,
      home_city: Array.isArray(data.home_city) ? data.home_city[0] : data.home_city,
      current_city: Array.isArray(data.current_city) ? data.current_city[0] : data.current_city,
      college: Array.isArray(data.college) ? data.college[0] : data.college,
      course: Array.isArray(data.course) ? data.course[0] : data.course,
      branch: Array.isArray(data.branch) ? data.branch[0] : data.branch,
    };
  },
};
