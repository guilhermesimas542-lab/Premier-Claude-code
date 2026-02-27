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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      banner_analytics: {
        Row: {
          banner_id: string
          created_at: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          banner_id: string
          created_at?: string
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_analytics_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "content_banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      betting_houses: {
        Row: {
          aviator_url: string | null
          created_at: string
          football_studio_url: string | null
          id: string
          iframe_url: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          mines_url: string | null
          name: string
          popup_alavancagem_image: string | null
          popup_alavancagem_link: string | null
          popup_basic_image: string | null
          popup_basic_link: string | null
          popup_live_telegram_image: string | null
          popup_live_telegram_link: string | null
          popup_odds_altas_image: string | null
          popup_odds_altas_link: string | null
          popup_pro_image: string | null
          popup_pro_link: string | null
          popup_ultra_image: string | null
          popup_ultra_link: string | null
          popup_welcome_image: string | null
          popup_welcome_link: string | null
          roleta_url: string | null
          slug: string
        }
        Insert: {
          aviator_url?: string | null
          created_at?: string
          football_studio_url?: string | null
          id?: string
          iframe_url?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          mines_url?: string | null
          name: string
          popup_alavancagem_image?: string | null
          popup_alavancagem_link?: string | null
          popup_basic_image?: string | null
          popup_basic_link?: string | null
          popup_live_telegram_image?: string | null
          popup_live_telegram_link?: string | null
          popup_odds_altas_image?: string | null
          popup_odds_altas_link?: string | null
          popup_pro_image?: string | null
          popup_pro_link?: string | null
          popup_ultra_image?: string | null
          popup_ultra_link?: string | null
          popup_welcome_image?: string | null
          popup_welcome_link?: string | null
          roleta_url?: string | null
          slug: string
        }
        Update: {
          aviator_url?: string | null
          created_at?: string
          football_studio_url?: string | null
          id?: string
          iframe_url?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          mines_url?: string | null
          name?: string
          popup_alavancagem_image?: string | null
          popup_alavancagem_link?: string | null
          popup_basic_image?: string | null
          popup_basic_link?: string | null
          popup_live_telegram_image?: string | null
          popup_live_telegram_link?: string | null
          popup_odds_altas_image?: string | null
          popup_odds_altas_link?: string | null
          popup_pro_image?: string | null
          popup_pro_link?: string | null
          popup_ultra_image?: string | null
          popup_ultra_link?: string | null
          popup_welcome_image?: string | null
          popup_welcome_link?: string | null
          roleta_url?: string | null
          slug?: string
        }
        Relationships: []
      }
      content_banners: {
        Row: {
          betting_house_id: string | null
          button_link: string | null
          button_text: string | null
          context: string
          created_at: string
          display_order: number
          ends_at: string | null
          id: string
          image_url: string
          starts_at: string
          status: string
          subtitle: string
          tag: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          betting_house_id?: string | null
          button_link?: string | null
          button_text?: string | null
          context?: string
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url: string
          starts_at?: string
          status?: string
          subtitle?: string
          tag?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Update: {
          betting_house_id?: string | null
          button_link?: string | null
          button_text?: string | null
          context?: string
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string
          starts_at?: string
          status?: string
          subtitle?: string
          tag?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_banners_betting_house_id_fkey"
            columns: ["betting_house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      content_entries: {
        Row: {
          active: boolean
          addon_required: Database["public"]["Enums"]["product_key"] | null
          category: string | null
          category_explanation: string | null
          classification: string | null
          condition_to_win: string | null
          created_at: string
          date: string
          expires_at: string | null
          id: string
          justification: string | null
          link: string | null
          link_house_1: string | null
          link_house_2: string | null
          link_house_3: string | null
          market: string | null
          metadata: Json | null
          odd: number | null
          result: string
          starts_at: string | null
          team1_logo_url: string | null
          team1_name: string | null
          team1_primary_color: string | null
          team1_secondary_color: string | null
          team1_shirt_variant: string | null
          team2_logo_url: string | null
          team2_name: string | null
          team2_primary_color: string | null
          team2_secondary_color: string | null
          team2_shirt_variant: string | null
          tier_required: Database["public"]["Enums"]["main_tier"]
          title: string
        }
        Insert: {
          active?: boolean
          addon_required?: Database["public"]["Enums"]["product_key"] | null
          category?: string | null
          category_explanation?: string | null
          classification?: string | null
          condition_to_win?: string | null
          created_at?: string
          date: string
          expires_at?: string | null
          id?: string
          justification?: string | null
          link?: string | null
          link_house_1?: string | null
          link_house_2?: string | null
          link_house_3?: string | null
          market?: string | null
          metadata?: Json | null
          odd?: number | null
          result?: string
          starts_at?: string | null
          team1_logo_url?: string | null
          team1_name?: string | null
          team1_primary_color?: string | null
          team1_secondary_color?: string | null
          team1_shirt_variant?: string | null
          team2_logo_url?: string | null
          team2_name?: string | null
          team2_primary_color?: string | null
          team2_secondary_color?: string | null
          team2_shirt_variant?: string | null
          tier_required?: Database["public"]["Enums"]["main_tier"]
          title: string
        }
        Update: {
          active?: boolean
          addon_required?: Database["public"]["Enums"]["product_key"] | null
          category?: string | null
          category_explanation?: string | null
          classification?: string | null
          condition_to_win?: string | null
          created_at?: string
          date?: string
          expires_at?: string | null
          id?: string
          justification?: string | null
          link?: string | null
          link_house_1?: string | null
          link_house_2?: string | null
          link_house_3?: string | null
          market?: string | null
          metadata?: Json | null
          odd?: number | null
          result?: string
          starts_at?: string | null
          team1_logo_url?: string | null
          team1_name?: string | null
          team1_primary_color?: string | null
          team1_secondary_color?: string | null
          team1_shirt_variant?: string | null
          team2_logo_url?: string | null
          team2_name?: string | null
          team2_primary_color?: string | null
          team2_secondary_color?: string | null
          team2_shirt_variant?: string | null
          tier_required?: Database["public"]["Enums"]["main_tier"]
          title?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          product_key: Database["public"]["Enums"]["product_key"]
          source: Database["public"]["Enums"]["entitlement_source"]
          starts_at: string
          status: Database["public"]["Enums"]["entitlement_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          product_key: Database["public"]["Enums"]["product_key"]
          source?: Database["public"]["Enums"]["entitlement_source"]
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          product_key?: Database["public"]["Enums"]["product_key"]
          source?: Database["public"]["Enums"]["entitlement_source"]
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_predictions: {
        Row: {
          created_at: string | null
          id: string
          market: string
          market_explanation: string | null
          prediction: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          market: string
          market_explanation?: string | null
          prediction: string
        }
        Update: {
          created_at?: string | null
          id?: string
          market?: string
          market_explanation?: string | null
          prediction?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          target: string
          target_email: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          target?: string
          target_email?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          target?: string
          target_email?: string | null
          title?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          buyer_email: string
          created_at: string
          id: string
          paid_at: string | null
          provider: string
          provider_order_id: string
          raw_payload: Json | null
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          amount: number
          buyer_email: string
          created_at?: string
          id?: string
          paid_at?: string | null
          provider: string
          provider_order_id: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          amount?: number
          buyer_email?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_order_id?: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: []
      }
      popups: {
        Row: {
          betting_house_id: string | null
          checkout_link: string | null
          created_at: string
          final_benefits: Json | null
          final_title: string | null
          id: string
          image_url: string | null
          is_active: boolean
          question_1_options: Json | null
          question_1_text: string | null
          question_2_options: Json | null
          question_2_text: string | null
          question_3_options: Json | null
          question_3_text: string | null
          target_audience: string
          type: string
          updated_at: string
        }
        Insert: {
          betting_house_id?: string | null
          checkout_link?: string | null
          created_at?: string
          final_benefits?: Json | null
          final_title?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          question_1_options?: Json | null
          question_1_text?: string | null
          question_2_options?: Json | null
          question_2_text?: string | null
          question_3_options?: Json | null
          question_3_text?: string | null
          target_audience?: string
          type: string
          updated_at?: string
        }
        Update: {
          betting_house_id?: string | null
          checkout_link?: string | null
          created_at?: string
          final_benefits?: Json | null
          final_title?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          question_1_options?: Json | null
          question_1_text?: string | null
          question_2_options?: Json | null
          question_2_text?: string | null
          question_3_options?: Json | null
          question_3_text?: string | null
          target_audience?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "popups_betting_house_id_fkey"
            columns: ["betting_house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription_object: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_object: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription_object?: Json
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string | null
          referrer_user_id: string | null
          xp_awarded: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id?: string | null
          referrer_user_id?: string | null
          xp_awarded?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string | null
          referrer_user_id?: string | null
          xp_awarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          last_heartbeat_at: string | null
          session_end_at: string | null
          session_start_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_heartbeat_at?: string | null
          session_end_at?: string | null
          session_start_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_heartbeat_at?: string | null
          session_end_at?: string | null
          session_start_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          logo_url: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          friends_invited: number
          last_login_date: string | null
          longest_streak: number
          total_logins: number
          total_xp: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          friends_invited?: number
          last_login_date?: string | null
          longest_streak?: number
          total_logins?: number
          total_xp?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          friends_invited?: number
          last_login_date?: string | null
          longest_streak?: number
          total_logins?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gamification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_id: string | null
          betting_house_id: string | null
          created_at: string
          email: string
          id: string
          is_vitalicio: boolean
          last_event_at: string | null
          last_seen_at: string | null
          main_tier: Database["public"]["Enums"]["main_tier"]
          nickname: string | null
          phone: string | null
          vitalicio_since: string | null
        }
        Insert: {
          avatar_id?: string | null
          betting_house_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_vitalicio?: boolean
          last_event_at?: string | null
          last_seen_at?: string | null
          main_tier?: Database["public"]["Enums"]["main_tier"]
          nickname?: string | null
          phone?: string | null
          vitalicio_since?: string | null
        }
        Update: {
          avatar_id?: string | null
          betting_house_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_vitalicio?: boolean
          last_event_at?: string | null
          last_seen_at?: string | null
          main_tier?: Database["public"]["Enums"]["main_tier"]
          nickname?: string | null
          phone?: string | null
          vitalicio_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_betting_house_id_fkey"
            columns: ["betting_house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_is_admin_email: { Args: { p_email: string }; Returns: boolean }
      get_allowed_tiers: {
        Args: { user_tier: Database["public"]["Enums"]["main_tier"] }
        Returns: Database["public"]["Enums"]["main_tier"][]
      }
      get_display_tips: {
        Args: { p_email: string }
        Returns: {
          addon_required: Database["public"]["Enums"]["product_key"]
          category: string
          category_explanation: string
          classification: string
          condition_to_win: string
          created_at: string
          date: string
          display_status: string
          expires_at: string
          id: string
          justification: string
          link: string
          metadata: Json
          odd: number
          starts_at: string
          team1_logo_url: string
          team1_name: string
          team1_primary_color: string
          team1_secondary_color: string
          team1_shirt_variant: string
          team2_logo_url: string
          team2_name: string
          team2_primary_color: string
          team2_secondary_color: string
          team2_shirt_variant: string
          tier_required: Database["public"]["Enums"]["main_tier"]
          title: string
        }[]
      }
      get_or_create_user: {
        Args: { p_email: string }
        Returns: {
          avatar_id: string | null
          betting_house_id: string | null
          created_at: string
          email: string
          id: string
          is_vitalicio: boolean
          last_event_at: string | null
          last_seen_at: string | null
          main_tier: Database["public"]["Enums"]["main_tier"]
          nickname: string | null
          phone: string | null
          vitalicio_since: string | null
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_active_entitlement: {
        Args: {
          p_product: Database["public"]["Enums"]["product_key"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      entitlement_source: "purchase" | "manual" | "admin"
      entitlement_status: "active" | "expired" | "revoked"
      main_tier: "free" | "basic" | "pro" | "ultra"
      order_status: "paid" | "refunded" | "chargeback"
      product_key:
        | "alavancagem"
        | "desaltas"
        | "live_telegram"
        | "acesso_vitalicio"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      entitlement_source: ["purchase", "manual", "admin"],
      entitlement_status: ["active", "expired", "revoked"],
      main_tier: ["free", "basic", "pro", "ultra"],
      order_status: ["paid", "refunded", "chargeback"],
      product_key: [
        "alavancagem",
        "desaltas",
        "live_telegram",
        "acesso_vitalicio",
      ],
    },
  },
} as const
