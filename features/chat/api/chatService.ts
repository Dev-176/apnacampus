import { supabase } from '../../../lib/supabase';
import { ConversationItem, DeleteMessageParams, SendMessageParams } from '../types';
import { Message } from '../../../types/database';

export const chatService = {
  /**
   * List all conversations for current user with details, unread count, and connection status
   */
  async listConversations(): Promise<ConversationItem[]> {
    const { data, error } = await supabase.rpc('list_conversations');
    if (error) {
      console.error('Error listing conversations:', error);
      throw new Error(error.message || 'Failed to list conversations');
    }
    return (data || []) as ConversationItem[];
  },

  /**
   * Get or create a 1-on-1 conversation for an accepted connection
   */
  async getOrCreateConversation(connectionId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_or_create_conversation_for_connection', {
      p_connection_id: connectionId,
    });
    if (error) {
      console.error('Error getting/creating conversation:', error);
      throw new Error(error.message || 'Failed to initialize conversation');
    }
    return data as string;
  },

  /**
   * Fetch paginated messages for a conversation in reverse-chronological order (newest first)
   */
  async getMessages(
    conversationId: string,
    limit = 50,
    beforeCreatedAt?: string
  ): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeCreatedAt) {
      query = query.lt('created_at', beforeCreatedAt);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error(error.message || 'Failed to fetch messages');
    }

    return (data || []) as Message[];
  },

  /**
   * Send a text message via send_message RPC
   */
  async sendMessage({ conversationId, body, clientId }: SendMessageParams): Promise<string> {
    const trimmed = body.trim();
    if (trimmed.length < 1 || body.length > 2000) {
      throw new Error('Message body must be between 1 and 2000 characters');
    }

    const { data, error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_body: trimmed,
      p_client_id: clientId,
    });

    if (error) {
      console.error('Error sending message:', error);
      throw new Error(error.message || 'Failed to send message');
    }

    return data as string;
  },

  /**
   * Delete a message ('for_me' or 'for_everyone')
   */
  async deleteMessage({ messageId, deleteType }: DeleteMessageParams): Promise<boolean> {
    const { data, error } = await supabase.rpc('delete_message', {
      p_message_id: messageId,
      p_delete_type: deleteType,
    });

    if (error) {
      console.error('Error deleting message:', error);
      throw new Error(error.message || 'Failed to delete message');
    }

    return Boolean(data);
  },

  /**
   * Mark all messages in a conversation as read by the current user
   */
  async markConversationRead(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error('Error marking conversation read:', error);
      throw new Error(error.message || 'Failed to mark conversation read');
    }

    return Boolean(data);
  },
};
