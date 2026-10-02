import { supabase } from '../../../lib/supabase';
import {
  ConnectionItem,
  ConnectionRequestItem,
  ConnectionStatusResult,
} from '../types';

export const connectionsService = {
  /**
   * Send a connection request with an optional intro message (max 200 chars)
   */
  async sendRequest(receiverId: string, introMessage?: string): Promise<string> {
    const { data, error } = await supabase.rpc('send_request', {
      p_receiver_id: receiverId,
      p_intro_message: introMessage ? introMessage.trim() : null,
    });

    if (error) {
      console.error('Error sending connection request:', error);
      throw new Error(error.message || 'Failed to send connection request');
    }

    return data as string;
  },

  /**
   * Accept or decline an incoming connection request
   */
  async respondRequest(requestId: string, action: 'accept' | 'reject'): Promise<boolean> {
    const { data, error } = await supabase.rpc('respond_request', {
      p_request_id: requestId,
      p_action: action,
    });

    if (error) {
      console.error('Error responding to connection request:', error);
      throw new Error(error.message || 'Failed to respond to connection request');
    }

    return Boolean(data);
  },

  /**
   * Withdraw a pending outgoing request (deletes the request row)
   */
  async withdrawRequest(requestId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('withdraw_request', {
      p_request_id: requestId,
    });

    if (error) {
      console.error('Error withdrawing connection request:', error);
      throw new Error(error.message || 'Failed to withdraw connection request');
    }

    return Boolean(data);
  },

  /**
   * List incoming or outgoing pending connection requests
   */
  async listRequests(type: 'incoming' | 'outgoing'): Promise<ConnectionRequestItem[]> {
    const { data, error } = await supabase.rpc('list_requests', {
      p_type: type,
    });

    if (error) {
      console.error(`Error listing ${type} requests:`, error);
      throw new Error(error.message || `Failed to load ${type} requests`);
    }

    return (data || []) as ConnectionRequestItem[];
  },

  /**
   * List all accepted connections
   */
  async listConnections(): Promise<ConnectionItem[]> {
    const { data, error } = await supabase.rpc('list_connections');

    if (error) {
      console.error('Error listing connections:', error);
      throw new Error(error.message || 'Failed to load connections');
    }

    return (data || []) as ConnectionItem[];
  },

  /**
   * Check connection status between authenticated user and target student
   */
  async getConnectionStatus(targetUserId: string): Promise<ConnectionStatusResult> {
    const { data, error } = await supabase.rpc('get_connection_status', {
      p_target_user_id: targetUserId,
    });

    if (error) {
      console.error('Error getting connection status:', error);
      return { status: 'none', requestId: null };
    }

    const first = (data && data[0]) as { status: string; request_id: string | null } | undefined;
    return {
      status: (first?.status as ConnectionStatusResult['status']) || 'none',
      requestId: first?.request_id || null,
    };
  },
};
