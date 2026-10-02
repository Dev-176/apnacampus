import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { discoverService } from '../api/discoverService';
import { DiscoverFilters } from '../types';
import { useDebounce } from '../../../hooks/useDebounce';

export function useDiscover(filters: DiscoverFilters = {}, searchInput: string = '') {
  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const query = useInfiniteQuery({
    queryKey: ['discover', filters, debouncedSearch],
    queryFn: async ({ pageParam }) => {
      return discoverService.getRecommendations({
        ...filters,
        search: debouncedSearch,
        cursor: pageParam,
        limit: 10,
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 10) return undefined;
      return lastPage[lastPage.length - 1]?.cursor_token;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const students = query.data?.pages.flatMap((page) => page) ?? [];

  return {
    ...query,
    students,
    debouncedSearch,
  };
}

export function useHometownPeers(homeCityId?: string | null) {
  return useQuery({
    queryKey: ['hometown-peers', homeCityId],
    queryFn: async () => {
      if (!homeCityId) return [];
      return discoverService.getHometownPeers(homeCityId, 6);
    },
    enabled: Boolean(homeCityId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useStudentProfile(studentId?: string | null) {
  return useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return discoverService.getPublicStudentProfile(studentId);
    },
    enabled: Boolean(studentId),
    staleTime: 1000 * 60 * 5,
  });
}
