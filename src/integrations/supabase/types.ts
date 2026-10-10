export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      creator_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          rate_per_view: number
          status: Database["public"]["Enums"]["earning_status"]
          updated_at: string
          user_id: string
          verified_views: number
          video_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          rate_per_view?: number
          status?: Database["public"]["Enums"]["earning_status"]
          updated_at?: string
          user_id: string
          verified_views?: number
          video_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          rate_per_view?: number
          status?: Database["public"]["Enums"]["earning_status"]
          updated_at?: string
          user_id?: string
          verified_views?: number
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_wallets: {
        Row: {
          balance_available: number
          balance_paid: number
          balance_pending: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_available?: number
          balance_paid?: number
          balance_pending?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_available?: number
          balance_paid?: number
          balance_pending?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      monetization_settings: {
        Row: {
          id: number
          min_followers: number
          min_payout: number
          min_videos: number
          min_views: number
          rate_per_view: number
          updated_at: string
          verification_days: number
        }
        Insert: {
          id?: number
          min_followers?: number
          min_payout?: number
          min_videos?: number
          min_views?: number
          rate_per_view?: number
          updated_at?: string
          verification_days?: number
        }
        Update: {
          id?: number
          min_followers?: number
          min_payout?: number
          min_videos?: number
          min_views?: number
          rate_per_view?: number
          updated_at?: string
          verification_days?: number
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_details: string
          payment_method: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_details: string
          payment_method: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_details?: string
          payment_method?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reactions: {
        Row: {
          created_at: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reactions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          storage_path: string | null
          tags: string[]
          title: string
          user_id: string
          views: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          user_id: string
          views?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      profile_subscriptions: {
        Row: {
          active: boolean
          amount_monthly: number
          cancelled_at: string | null
          created_at: string
          creator_id: string
          id: string
          subscriber_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_monthly?: number
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          id?: string
          subscriber_id: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_monthly?: number
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          subscriber_id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          instagram_url: string | null
          is_verified: boolean
          location: string | null
          monetization_blocked: boolean
          monetization_enabled: boolean
          onlyfans_url: string | null
          telegram_url: string | null
          tiktok_url: string | null
          total_followers: number
          total_subscribers: number
          total_videos: number
          total_views: number
          twitter_url: string | null
          username: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          instagram_url?: string | null
          is_verified?: boolean
          location?: string | null
          monetization_blocked?: boolean
          monetization_enabled?: boolean
          onlyfans_url?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          total_followers?: number
          total_subscribers?: number
          total_videos?: number
          total_views?: number
          twitter_url?: string | null
          username: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_verified?: boolean
          location?: string | null
          monetization_blocked?: boolean
          monetization_enabled?: boolean
          onlyfans_url?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          total_followers?: number
          total_subscribers?: number
          total_videos?: number
          total_views?: number
          twitter_url?: string | null
          username?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_favorites: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reactions: {
        Row: {
          created_at: string
          reaction: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          reaction: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          reaction?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["view_status"]
          user_agent_hash: string | null
          video_id: string
          viewer_user_id: string | null
          visitor_id: string | null
          watch_percentage: number
          watch_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["view_status"]
          user_agent_hash?: string | null
          video_id: string
          viewer_user_id?: string | null
          visitor_id?: string | null
          watch_percentage?: number
          watch_seconds?: number
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["view_status"]
          user_agent_hash?: string | null
          video_id?: string
          viewer_user_id?: string | null
          visitor_id?: string | null
          watch_percentage?: number
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          monetized: boolean
          storage_path: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          user_id: string | null
          video_url: string
          views: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          monetized?: boolean
          storage_path?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          user_id?: string | null
          video_url: string
          views?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          monetized?: boolean
          storage_path?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          user_id?: string | null
          video_url?: string
          views?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_monetization: {
        Args: { _blocked: boolean; _enabled: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_payout_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["payout_status"]
          _notes: string
          _payout_id: string
        }
        Returns: undefined
      }
      admin_set_verified: {
        Args: { _user_id: string; _verified: boolean }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_video_views: { Args: { video_id: string }; Returns: number }
      record_video_view: {
        Args: {
          _ip_hash: string
          _ua_hash: string
          _video_id: string
          _viewer_user_id: string
          _visitor_id: string
          _watch_percentage: number
          _watch_seconds: number
        }
        Returns: Json
      }
      refresh_monetization_eligibility: {
        Args: { _user_id: string }
        Returns: undefined
      }
      request_payout: {
        Args: { _amount: number; _details: string; _method: string }
        Returns: string
      }
      verify_pending_views: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      earning_status: "pending" | "available" | "paid"
      payout_status: "pending" | "approved" | "rejected" | "paid"
      subscription_tier: "free" | "basic" | "premium"
      view_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      earning_status: ["pending", "available", "paid"],
      payout_status: ["pending", "approved", "rejected", "paid"],
      subscription_tier: ["free", "basic", "premium"],
      view_status: ["pending", "verified", "rejected"],
    },
  },
} as const
