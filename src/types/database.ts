/**
 * Hand-written mirror of supabase/migrations/*.sql. If the schema changes,
 * update this alongside the migrations (or generate it with
 * `supabase gen types typescript` once the project is linked).
 *
 * `Relationships: []` and `Views: {}` are required by @supabase/postgrest-js's
 * generic constraints even though this schema doesn't use either — omitting
 * them makes every query resolve to `never`.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          about: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          avatar_url?: string | null;
          about?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>;
        Relationships: [];
      };
      chats: {
        Row: {
          id: string;
          type: 'direct' | 'group';
          group_name: string | null;
          group_photo: string | null;
          created_by: string;
          last_message: {
            text: string;
            senderId: string;
            createdAt: string;
            type: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: 'direct' | 'group';
          group_name?: string | null;
          group_photo?: string | null;
          created_by: string;
          last_message?: Database['public']['Tables']['chats']['Row']['last_message'];
        };
        Update: Partial<Database['public']['Tables']['chats']['Insert']>;
        Relationships: [];
      };
      chat_members: {
        Row: {
          chat_id: string;
          user_id: string;
          unread_count: number;
          joined_at: string;
        };
        Insert: {
          chat_id: string;
          user_id: string;
          unread_count?: number;
        };
        Update: Partial<Database['public']['Tables']['chat_members']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          type: 'text' | 'image' | 'file' | 'video' | 'audio';
          text: string | null;
          media_url: string | null;
          media_type: string | null;
          file_name: string | null;
          status: 'sent' | 'delivered' | 'read';
          read_by: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          type: 'text' | 'image' | 'file' | 'video' | 'audio';
          text?: string | null;
          media_url?: string | null;
          media_type?: string | null;
          file_name?: string | null;
          status?: 'sent' | 'delivered' | 'read';
          read_by?: string[];
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          caller_id: string;
          caller_name: string;
          callee_id: string;
          type: 'voice' | 'video';
          status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
          offer: { sdp: string; type: string } | null;
          answer: { sdp: string; type: string } | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          caller_id: string;
          caller_name: string;
          callee_id: string;
          type: 'voice' | 'video';
          status?: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
          offer?: { sdp: string; type: string } | null;
          answer?: { sdp: string; type: string } | null;
        };
        Update: Partial<Database['public']['Tables']['calls']['Insert']>;
        Relationships: [];
      };
      call_candidates: {
        Row: {
          id: string;
          call_id: string;
          sender_id: string;
          candidate: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          sender_id: string;
          candidate: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['call_candidates']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_unread_counts: {
        Args: { p_chat_id: string; p_sender_id: string };
        Returns: void;
      };
      mark_messages_read: {
        Args: { p_message_ids: string[]; p_chat_id: string };
        Returns: void;
      };
      is_chat_member: {
        Args: { p_chat_id: string };
        Returns: boolean;
      };
    };
  };
};
