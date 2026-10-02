export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          name: string;
          state: string;
          region: string | null;
          is_popular_hometown: boolean;
          is_popular_destination: boolean;
          is_seed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          state: string;
          region?: string | null;
          is_popular_hometown?: boolean;
          is_popular_destination?: boolean;
          is_seed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          state?: string;
          region?: string | null;
          is_popular_hometown?: boolean;
          is_popular_destination?: boolean;
          is_seed?: boolean;
          created_at?: string;
        };
      };
      colleges: {
        Row: {
          id: string;
          name: string;
          short_name: string | null;
          city_id: string;
          is_seed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string | null;
          city_id: string;
          is_seed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string | null;
          city_id?: string;
          is_seed?: boolean;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          name: string;
          duration_years: number;
          is_seed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          duration_years?: number;
          is_seed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          duration_years?: number;
          is_seed?: boolean;
          created_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          course_id: string;
          name: string;
          is_seed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          name: string;
          is_seed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          name?: string;
          is_seed?: boolean;
          created_at?: string;
        };
      };
      college_suggestions: {
        Row: {
          id: string;
          user_id: string | null;
          college_name: string;
          city_name: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          college_name: string;
          city_name: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          college_name?: string;
          city_name?: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          username: string | null;
          avatar_url: string | null;
          home_city_id: string | null;
          current_city_id: string | null;
          college_id: string | null;
          course_id: string | null;
          branch_id: string | null;
          year_of_study: number | null;
          interests: string[];
          skills_to_teach: string[];
          bio: string | null;
          is_18_confirmed: boolean;
          date_of_birth: string | null;
          is_verified: boolean;
          is_onboarded: boolean;
          is_active: boolean;
          is_suspended: boolean;
          is_banned: boolean;
          is_seed: boolean;
          visibility: 'discoverable' | 'connections_only' | 'hidden';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          username?: string | null;
          avatar_url?: string | null;
          home_city_id?: string | null;
          current_city_id?: string | null;
          college_id?: string | null;
          course_id?: string | null;
          branch_id?: string | null;
          year_of_study?: number | null;
          interests?: string[];
          skills_to_teach?: string[];
          bio?: string | null;
          is_18_confirmed?: boolean;
          date_of_birth?: string | null;
          is_verified?: boolean;
          is_onboarded?: boolean;
          is_active?: boolean;
          is_suspended?: boolean;
          is_banned?: boolean;
          is_seed?: boolean;
          visibility?: 'discoverable' | 'connections_only' | 'hidden';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          username?: string | null;
          avatar_url?: string | null;
          home_city_id?: string | null;
          current_city_id?: string | null;
          college_id?: string | null;
          course_id?: string | null;
          branch_id?: string | null;
          year_of_study?: number | null;
          interests?: string[];
          skills_to_teach?: string[];
          bio?: string | null;
          is_18_confirmed?: boolean;
          date_of_birth?: string | null;
          is_verified?: boolean;
          is_onboarded?: boolean;
          is_active?: boolean;
          is_suspended?: boolean;
          is_banned?: boolean;
          is_seed?: boolean;
          visibility?: 'discoverable' | 'connections_only' | 'hidden';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          discoverable: boolean;
          allow_connection_requests_from: 'everyone' | 'same_college' | 'same_city';
          allow_messages_from: 'connections' | 'everyone';
          read_receipts_enabled: boolean;
          notifications_connections: boolean;
          notifications_messages: boolean;
          notifications_groups: boolean;
          notifications_study: boolean;
          notifications_travel: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          discoverable?: boolean;
          allow_connection_requests_from?: 'everyone' | 'same_college' | 'same_city';
          allow_messages_from?: 'connections' | 'everyone';
          read_receipts_enabled?: boolean;
          notifications_connections?: boolean;
          notifications_messages?: boolean;
          notifications_groups?: boolean;
          notifications_study?: boolean;
          notifications_travel?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          discoverable?: boolean;
          allow_connection_requests_from?: 'everyone' | 'same_college' | 'same_city';
          allow_messages_from?: 'connections' | 'everyone';
          read_receipts_enabled?: boolean;
          notifications_connections?: boolean;
          notifications_messages?: boolean;
          notifications_groups?: boolean;
          notifications_study?: boolean;
          notifications_travel?: boolean;
          updated_at?: string;
        };
      };
      connections: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'blocked';
          intro_message: string | null;
          created_at: string;
          updated_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked';
          intro_message?: string | null;
          created_at?: string;
          updated_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked';
          intro_message?: string | null;
          created_at?: string;
          updated_at?: string;
          responded_at?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          connection_id: string;
          created_at: string;
          updated_at: string;
          last_message_at: string | null;
          last_message_preview: string | null;
        };
        Insert: {
          id?: string;
          connection_id: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
        };
        Update: {
          id?: string;
          connection_id?: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
          last_read_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          message_type: 'text' | 'system';
          client_id: string;
          created_at: string;
          read_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string;
          body: string;
          message_type?: 'text' | 'system';
          client_id: string;
          created_at?: string;
          read_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          message_type?: 'text' | 'system';
          client_id?: string;
          created_at?: string;
          read_at?: string | null;
          deleted_at?: string | null;
        };
      };
      hidden_messages: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          hidden_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          hidden_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          hidden_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      rls_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          table_name: string;
          rls_enabled: boolean;
        }[];
      };
      recommend_students: {
        Args: {
          p_limit?: number;
          p_cursor?: string | null;
          p_home_city_id?: string | null;
          p_current_city_id?: string | null;
          p_college_id?: string | null;
          p_course_id?: string | null;
          p_branch_id?: string | null;
          p_year_of_study?: number | null;
          p_interest?: string | null;
          p_skill?: string | null;
          p_search?: string | null;
          p_sort_by?: string;
          p_region?: string | null;
        };
        Returns: StudentRecommendation[];
      };
      send_request: {
        Args: {
          p_receiver_id: string;
          p_intro_message?: string | null;
        };
        Returns: string;
      };
      respond_request: {
        Args: {
          p_request_id: string;
          p_action: 'accept' | 'reject';
        };
        Returns: boolean;
      };
      withdraw_request: {
        Args: {
          p_request_id: string;
        };
        Returns: boolean;
      };
      list_requests: {
        Args: {
          p_type: 'incoming' | 'outgoing';
        };
        Returns: ConnectionRequestItem[];
      };
      list_connections: {
        Args: Record<PropertyKey, never>;
        Returns: ConnectionItem[];
      };
      get_connection_status: {
        Args: {
          p_target_user_id: string;
        };
        Returns: {
          status: string;
          request_id: string | null;
        }[];
      };
      send_message: {
        Args: {
          p_conversation_id: string;
          p_body: string;
          p_client_id: string;
        };
        Returns: string;
      };
      delete_message: {
        Args: {
          p_message_id: string;
          p_delete_type: 'for_me' | 'for_everyone';
        };
        Returns: boolean;
      };
      mark_conversation_read: {
        Args: {
          p_conversation_id: string;
        };
        Returns: boolean;
      };
      list_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: ConversationListItem[];
      };
      get_or_create_conversation_for_connection: {
        Args: {
          p_connection_id: string;
        };
        Returns: string;
      };
      block_user: {
        Args: {
          p_target_user_id: string;
        };
        Returns: boolean;
      };
      delete_current_user: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      connection_status: 'pending' | 'accepted' | 'rejected' | 'blocked';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type City = Database['public']['Tables']['cities']['Row'];
export type College = Database['public']['Tables']['colleges']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Branch = Database['public']['Tables']['branches']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type CollegeSuggestion = Database['public']['Tables']['college_suggestions']['Row'];
export type Connection = Database['public']['Tables']['connections']['Row'];
export type ConnectionStatus = Database['public']['Enums']['connection_status'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type HiddenMessage = Database['public']['Tables']['hidden_messages']['Row'];

export interface ConversationListItem {
  conversation_id: string;
  other_user_id: string;
  other_full_name: string;
  other_username: string | null;
  other_avatar_url: string | null;
  other_college_name: string | null;
  other_branch_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_connection_active: boolean;
}

export interface ConnectionRequestItem {
  request_id: string;
  intro_message: string | null;
  created_at: string;
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  college_name: string | null;
  course_name: string | null;
  branch_name: string | null;
  year_of_study: number | null;
  home_city_name: string | null;
  current_city_name: string | null;
}

export interface ConnectionItem {
  connection_id: string;
  connected_at: string;
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  college_name: string | null;
  course_name: string | null;
  branch_name: string | null;
  year_of_study: number | null;
  home_city_name: string | null;
  current_city_name: string | null;
}

export interface StudentRecommendation {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  home_city_id: string | null;
  home_city_name: string | null;
  home_city_state: string | null;
  home_city_region: string | null;
  current_city_id: string | null;
  current_city_name: string | null;
  current_city_state: string | null;
  current_city_region: string | null;
  college_id: string | null;
  college_name: string | null;
  college_short_name: string | null;
  course_id: string | null;
  course_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  year_of_study: number | null;
  interests: string[];
  skills_to_teach: string[];
  is_verified: boolean;
  is_seed: boolean;
  match_score: number;
  match_reasons: string[];
  mutual_connections_count: number;
  cursor_token: string;
}
