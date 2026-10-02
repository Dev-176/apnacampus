import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { chatService } from '../api/chatService';
import { ChatMessage, DeleteMessageParams } from '../types';
import { Message } from '../../../types/database';

export function useConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations(),
  });

  useEffect(() => {
    // Subscribe to conversations changes
    const channel = supabase
      .channel('realtime:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatService.getMessages(conversationId),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            queryClient.setQueryData<ChatMessage[]>(
              ['messages', conversationId],
              (old: ChatMessage[] | undefined) => {
                const list = old || [];
                // Deduplicate by client_id or id
                const existingIdx = list.findIndex(
                  (m) =>
                    m.id === newMsg.id ||
                    (m.client_id && m.client_id === newMsg.client_id)
                );
                if (existingIdx !== -1) {
                  const updated = [...list];
                  updated[existingIdx] = {
                    ...newMsg,
                    state: 'sent',
                  };
                  return updated;
                }
                return [{ ...newMsg, state: 'sent' }, ...list];
              }
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            queryClient.setQueryData<ChatMessage[]>(
              ['messages', conversationId],
              (old: ChatMessage[] | undefined) => {
                const list = old || [];
                return list.map((m) =>
                  m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
                );
              }
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return {
    ...query,
    isRealtimeConnected,
  };
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
      clientId,
      currentUserId,
    }: {
      body: string;
      clientId: string;
      currentUserId: string;
    }) => {
      // Optimistic message placed into cache
      const tempId = clientId;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        body,
        message_type: 'text',
        client_id: clientId,
        created_at: new Date().toISOString(),
        read_at: null,
        deleted_at: null,
        state: 'sending',
      };

      queryClient.setQueryData<ChatMessage[]>(
        ['messages', conversationId],
        (old: ChatMessage[] | undefined) => [optimisticMsg, ...(old || [])]
      );

      try {
        const confirmedId = await chatService.sendMessage({
          conversationId,
          body,
          clientId,
        });

        // Mark as sent with real server id
        queryClient.setQueryData<ChatMessage[]>(
          ['messages', conversationId],
          (old: ChatMessage[] | undefined) =>
            (old || []).map((m) =>
              m.client_id === clientId
                ? { ...m, id: confirmedId, state: 'sent' }
                : m
            )
        );

        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        return confirmedId;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send';
        // Mark as failed
        queryClient.setQueryData<ChatMessage[]>(
          ['messages', conversationId],
          (old: ChatMessage[] | undefined) =>
            (old || []).map((m) =>
              m.client_id === clientId
                ? { ...m, state: 'failed', error: errorMsg }
                : m
            )
        );
        throw err;
      }
    },
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DeleteMessageParams) => chatService.deleteMessage(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => chatService.markConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}
