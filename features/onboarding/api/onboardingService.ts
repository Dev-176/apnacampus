import { supabase } from '../../../lib/supabase';
import { City, College, Course, Branch, Profile } from '../../../types/database';

export interface CollegeSuggestionInput {
  collegeName: string;
  cityName: string;
}

export const onboardingService = {
  async getCities(): Promise<City[]> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('is_popular_hometown', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as City[]) || [];
  },

  async getColleges(cityId?: string): Promise<College[]> {
    let query = supabase
      .from('colleges')
      .select('*')
      .order('name', { ascending: true });

    if (cityId) {
      query = query.eq('city_id', cityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as College[]) || [];
  },

  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as Course[]) || [];
  },

  async getBranches(courseId?: string): Promise<Branch[]> {
    let query = supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Branch[]) || [];
  },

  async submitCollegeSuggestion(input: CollegeSuggestionInput): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('college_suggestions').insert({
      user_id: user?.id || null,
      college_name: input.collegeName.trim(),
      city_name: input.cityName.trim(),
      status: 'pending',
    });

    if (error) throw error;
  },

  async getMyProfile(): Promise<Profile | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return (data as Profile) || null;
  },

  async updateMyProfile(updates: Partial<Profile>): Promise<Profile> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async uploadAvatar(userId: string, fileBytes: ArrayBuffer, mimeType: string): Promise<string> {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${userId}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    // Update avatar_url in profiles table
    await this.updateMyProfile({ avatar_url: publicUrl });

    return publicUrl;
  },
};
