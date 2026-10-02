import { StudentRecommendation } from '../../types/database';

export type DiscoverSortOption =
  | 'relevance'
  | 'same_hometown'
  | 'same_college'
  | 'same_course'
  | 'same_branch'
  | 'mutual_connections';

export interface DiscoverFilters {
  homeCityId?: string | null;
  currentCityId?: string | null;
  collegeId?: string | null;
  courseId?: string | null;
  branchId?: string | null;
  yearOfStudy?: number | null;
  interest?: string | null;
  skill?: string | null;
  search?: string | null;
  sortBy?: DiscoverSortOption;
  expandNcr?: boolean;
}

export interface PublicStudentProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  year_of_study: number | null;
  interests: string[];
  skills_to_teach: string[];
  is_verified: boolean;
  is_seed: boolean;
  home_city?: {
    id: string;
    name: string;
    state: string;
    region: string | null;
  } | null;
  current_city?: {
    id: string;
    name: string;
    state: string;
    region: string | null;
  } | null;
  college?: {
    id: string;
    name: string;
    short_name: string | null;
  } | null;
  course?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
}

export type { StudentRecommendation };
