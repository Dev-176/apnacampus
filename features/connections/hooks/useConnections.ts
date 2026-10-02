import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsService } from '../api/connectionsService';
import { ConnectionStatusResult } from '../types';

export function useIncomingRequests() {
  return useQuery({
    queryKey: ['incoming-requests'],
    queryFn: () => connectionsService.listRequests('incoming'),
    staleTime: 1000 * 30, // 30s
  });
}

export function useOutgoingRequests() {
  return useQuery({
    queryKey: ['outgoing-requests'],
    queryFn: () => connectionsService.listRequests('outgoing'),
    staleTime: 1000 * 30,
  });
}

export function useConnectionsList() {
  return useQuery({
    queryKey: ['connections-list'],
    queryFn: () => connectionsService.listConnections(),
    staleTime: 1000 * 60, // 1 min
  });
}

export function useConnectionStatus(targetUserId?: string | null) {
  return useQuery<ConnectionStatusResult>({
    queryKey: ['connection-status', targetUserId],
    queryFn: async (): Promise<ConnectionStatusResult> => {
      if (!targetUserId) return { status: 'none', requestId: null };
      return connectionsService.getConnectionStatus(targetUserId);
    },
    enabled: Boolean(targetUserId),
    staleTime: 1000 * 30,
  });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiverId,
      introMessage,
    }: {
      receiverId: string;
      introMessage?: string;
    }) => connectionsService.sendRequest(receiverId, introMessage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-requests'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status', variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      queryClient.invalidateQueries({ queryKey: ['hometown-peers'] });
    },
  });
}

export function useRespondConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      action,
    }: {
      requestId: string;
      action: 'accept' | 'reject';
    }) => connectionsService.respondRequest(requestId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-requests'] });
      queryClient.invalidateQueries({ queryKey: ['connections-list'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      queryClient.invalidateQueries({ queryKey: ['hometown-peers'] });
    },
  });
}

export function useWithdrawConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string }) =>
      connectionsService.withdrawRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-requests'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      queryClient.invalidateQueries({ queryKey: ['hometown-peers'] });
    },
  });
}
