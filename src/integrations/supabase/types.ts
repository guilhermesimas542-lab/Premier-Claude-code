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
      achievements: {
        Row: {
          category: string
          condition_type: string
          condition_value: Json | null
          created_at: string | null
          description: string
          event_date: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          sport_category: string | null
          xp_reward: number
        }
        Insert: {
          category: string
          condition_type: string
          condition_value?: Json | null
          created_at?: string | null
          description: string
          event_date?: string | null
          icon: string
          id: string
          is_active?: boolean | null
          name: string
          sport_category?: string | null
          xp_reward?: number
        }
        Update: {
          category?: string
          condition_type?: string
          condition_value?: Json | null
          created_at?: string | null
          description?: string
          event_date?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sport_category?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
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
      admin_last_seen: {
        Row: {
          admin_email: string
          id: string
          last_seen_at: string
          section: string
        }
        Insert: {
          admin_email: string
          id?: string
          last_seen_at?: string
          section: string
        }
        Update: {
          admin_email?: string
          id?: string
          last_seen_at?: string
          section?: string
        }
        Relationships: []
      }
      ai_altenar_championships: {
        Row: {
          active: boolean
          altenar_cat_id: number | null
          altenar_champ_id: number
          altenar_sport_id: number
          api_football_league_id: number
          country: string | null
          created_at: string
          id: string
          last_sync_events_count: number | null
          last_synced_at: string | null
          league_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          altenar_cat_id?: number | null
          altenar_champ_id: number
          altenar_sport_id?: number
          api_football_league_id: number
          country?: string | null
          created_at?: string
          id?: string
          last_sync_events_count?: number | null
          last_synced_at?: string | null
          league_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          altenar_cat_id?: number | null
          altenar_champ_id?: number
          altenar_sport_id?: number
          api_football_league_id?: number
          country?: string | null
          created_at?: string
          id?: string
          last_sync_events_count?: number | null
          last_synced_at?: string | null
          league_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_beta_allowlist: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      ai_bug_reports: {
        Row: {
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          tip_cache_id: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          tip_cache_id?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          tip_cache_id?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_bug_reports_tip_cache_id_fkey"
            columns: ["tip_cache_id"]
            isOneToOne: false
            referencedRelation: "ai_tip_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_extras: {
        Row: {
          balance_bonus: number
          balance_purchased: number
          preview_used: boolean
          unlimited_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_bonus?: number
          balance_purchased?: number
          preview_used?: boolean
          unlimited_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_bonus?: number
          balance_purchased?: number
          preview_used?: boolean
          unlimited_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_extras_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_log: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_purchase: {
        Row: {
          amount_paid: number
          created_at: string
          credits_granted: number
          id: string
          paid_at: string | null
          payment_id: string | null
          payment_provider: string
          status: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          credits_granted: number
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_provider: string
          status?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          credits_granted?: number
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_purchase_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_weekly: {
        Row: {
          created_at: string
          last_tier: string | null
          updated_at: string
          user_id: string
          week_start_date: string
          weekly_quota: number
          weekly_used: number
        }
        Insert: {
          created_at?: string
          last_tier?: string | null
          updated_at?: string
          user_id: string
          week_start_date: string
          weekly_quota?: number
          weekly_used?: number
        }
        Update: {
          created_at?: string
          last_tier?: string | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
          weekly_quota?: number
          weekly_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_weekly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_weekly_backfill_log: {
        Row: {
          backfilled_at: string
          main_tier: string | null
          user_id: string
        }
        Insert: {
          backfilled_at?: string
          main_tier?: string | null
          user_id: string
        }
        Update: {
          backfilled_at?: string
          main_tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_featured_matches: {
        Row: {
          added_by: string | null
          api_football_fixture_id: number
          created_at: string
          date: string
          id: string
          priority: number
          source: string
        }
        Insert: {
          added_by?: string | null
          api_football_fixture_id: number
          created_at?: string
          date: string
          id?: string
          priority?: number
          source?: string
        }
        Update: {
          added_by?: string | null
          api_football_fixture_id?: number
          created_at?: string
          date?: string
          id?: string
          priority?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_featured_matches_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback: string
          id: string
          tip_cache_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback: string
          id?: string
          tip_cache_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback?: string
          id?: string
          tip_cache_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_tip_cache_id_fkey"
            columns: ["tip_cache_id"]
            isOneToOne: false
            referencedRelation: "ai_tip_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_match_altenar_map: {
        Row: {
          altenar_event_id: string
          altenar_event_url: string | null
          api_football_fixture_id: number
          away_team: string
          confidence: number
          created_at: string
          expires_at: string
          home_team: string
          kickoff_at: string
          league_id: number | null
          league_name: string | null
        }
        Insert: {
          altenar_event_id: string
          altenar_event_url?: string | null
          api_football_fixture_id: number
          away_team: string
          confidence: number
          created_at?: string
          expires_at: string
          home_team: string
          kickoff_at: string
          league_id?: number | null
          league_name?: string | null
        }
        Update: {
          altenar_event_id?: string
          altenar_event_url?: string | null
          api_football_fixture_id?: number
          away_team?: string
          confidence?: number
          created_at?: string
          expires_at?: string
          home_team?: string
          kickoff_at?: string
          league_id?: number | null
          league_name?: string | null
        }
        Relationships: []
      }
      ai_prematch_jobs: {
        Row: {
          errors: Json | null
          failed_count: number
          finished_at: string | null
          id: string
          matches_processed: number
          run_date: string
          started_at: string
          success_count: number
          total_cost_usd: number
          total_tokens_input: number
          total_tokens_output: number
        }
        Insert: {
          errors?: Json | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          matches_processed?: number
          run_date: string
          started_at?: string
          success_count?: number
          total_cost_usd?: number
          total_tokens_input?: number
          total_tokens_output?: number
        }
        Update: {
          errors?: Json | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          matches_processed?: number
          run_date?: string
          started_at?: string
          success_count?: number
          total_cost_usd?: number
          total_tokens_input?: number
          total_tokens_output?: number
        }
        Relationships: []
      }
      ai_team_aliases: {
        Row: {
          alias: string
          api_football_team_id: number
          created_at: string
          id: string
          priority: number
        }
        Insert: {
          alias: string
          api_football_team_id: number
          created_at?: string
          id?: string
          priority?: number
        }
        Update: {
          alias?: string
          api_football_team_id?: number
          created_at?: string
          id?: string
          priority?: number
        }
        Relationships: []
      }
      ai_tip_cache: {
        Row: {
          altenar_event_id: string | null
          api_football_fixture_id: number | null
          content: Json
          created_at: string
          expires_at: string
          generated_at: string
          generated_by_user_id: string | null
          hit_count: number
          id: string
          last_used_at: string | null
          match_key: string
          match_type: string
          source_data: Json | null
          tokens_cached: number | null
          tokens_input: number | null
          tokens_output: number | null
          version: number | null
        }
        Insert: {
          altenar_event_id?: string | null
          api_football_fixture_id?: number | null
          content: Json
          created_at?: string
          expires_at: string
          generated_at?: string
          generated_by_user_id?: string | null
          hit_count?: number
          id?: string
          last_used_at?: string | null
          match_key: string
          match_type: string
          source_data?: Json | null
          tokens_cached?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          version?: number | null
        }
        Update: {
          altenar_event_id?: string | null
          api_football_fixture_id?: number | null
          content?: Json
          created_at?: string
          expires_at?: string
          generated_at?: string
          generated_by_user_id?: string | null
          hit_count?: number
          id?: string
          last_used_at?: string | null
          match_key?: string
          match_type?: string
          source_data?: Json | null
          tokens_cached?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tip_cache_generated_by_user_id_fkey"
            columns: ["generated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tipster_settings: {
        Row: {
          disabled_message: string
          id: number
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          disabled_message?: string
          id?: number
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          disabled_message?: string
          id?: number
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_user_rejected_fixtures: {
        Row: {
          expires_at: string
          fixture_id: number | null
          id: string
          query_normalized: string
          rejected_at: string
          rejected_league_ids: number[] | null
          rejected_team_id: number | null
          user_id: string
        }
        Insert: {
          expires_at?: string
          fixture_id?: number | null
          id?: string
          query_normalized: string
          rejected_at?: string
          rejected_league_ids?: number[] | null
          rejected_team_id?: number | null
          user_id: string
        }
        Update: {
          expires_at?: string
          fixture_id?: number | null
          id?: string
          query_normalized?: string
          rejected_at?: string
          rejected_league_ids?: number[] | null
          rejected_team_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          component: string | null
          created_at: string
          error_fingerprint: string
          error_message: string
          error_stack: string | null
          house_id: string | null
          id: string
          properties: Json | null
          screen: string | null
          user_email: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          error_fingerprint: string
          error_message: string
          error_stack?: string | null
          house_id?: string | null
          id?: string
          properties?: Json | null
          screen?: string | null
          user_email?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string
          error_fingerprint?: string
          error_message?: string
          error_stack?: string | null
          house_id?: string | null
          id?: string
          properties?: Json | null
          screen?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_errors_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      betting_houses: {
        Row: {
          acquire_access_url: string | null
          created_at: string
          force_sports_link_new_tab: boolean
          id: string
          iframe_url: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          name: string
          open_in_new_tab: boolean
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
          slug: string
          support_whatsapp_url: string | null
          telegram_group_url: string | null
        }
        Insert: {
          acquire_access_url?: string | null
          created_at?: string
          force_sports_link_new_tab?: boolean
          id?: string
          iframe_url?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name: string
          open_in_new_tab?: boolean
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
          slug: string
          support_whatsapp_url?: string | null
          telegram_group_url?: string | null
        }
        Update: {
          acquire_access_url?: string | null
          created_at?: string
          force_sports_link_new_tab?: boolean
          id?: string
          iframe_url?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name?: string
          open_in_new_tab?: boolean
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
          slug?: string
          support_whatsapp_url?: string | null
          telegram_group_url?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          access_field: string | null
          badge_color: string | null
          badges: string[] | null
          button_bg_color: string | null
          button_font_color: string | null
          button_text_access: string | null
          button_text_acquire: string | null
          card_type: string
          category: string
          checkout_url: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_urls: Json | null
          is_active: boolean
          name: string
          pay_card_id: string | null
          product_id: string | null
          questions: Json | null
          requires_access: boolean | null
          slug: string | null
          subtitle: string | null
          target_audience: string
          title: string
          updated_at: string | null
        }
        Insert: {
          access_field?: string | null
          badge_color?: string | null
          badges?: string[] | null
          button_bg_color?: string | null
          button_font_color?: string | null
          button_text_access?: string | null
          button_text_acquire?: string | null
          card_type?: string
          category?: string
          checkout_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_urls?: Json | null
          is_active?: boolean
          name: string
          pay_card_id?: string | null
          product_id?: string | null
          questions?: Json | null
          requires_access?: boolean | null
          slug?: string | null
          subtitle?: string | null
          target_audience?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          access_field?: string | null
          badge_color?: string | null
          badges?: string[] | null
          button_bg_color?: string | null
          button_font_color?: string | null
          button_text_access?: string | null
          button_text_acquire?: string | null
          card_type?: string
          category?: string
          checkout_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_urls?: Json | null
          is_active?: boolean
          name?: string
          pay_card_id?: string | null
          product_id?: string | null
          questions?: Json | null
          requires_access?: boolean | null
          slug?: string | null
          subtitle?: string | null
          target_audience?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_pay_card_id_fkey"
            columns: ["pay_card_id"]
            isOneToOne: false
            referencedRelation: "pay_cards"
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
          feature_required: string | null
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
          feature_required?: string | null
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
          feature_required?: string | null
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
        Relationships: [
          {
            foreignKeyName: "content_entries_feature_required_fkey"
            columns: ["feature_required"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
        ]
      }
      crm_audience_members: {
        Row: {
          audience_id: string
          created_at: string
          email: string | null
          id: string
          metadata: Json
          phone: string | null
          user_id: string | null
        }
        Insert: {
          audience_id: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          audience_id?: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_audience_members_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "crm_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_audience_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_audiences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_audiences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_channel_settings: {
        Row: {
          active: boolean
          channel: string
          config: Json
          created_at: string
          id: string
          last_test_at: string | null
          last_test_success: boolean | null
          notes: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel: string
          config?: Json
          created_at?: string
          id?: string
          last_test_at?: string | null
          last_test_success?: boolean | null
          notes?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel?: string
          config?: Json
          created_at?: string
          id?: string
          last_test_at?: string | null
          last_test_success?: boolean | null
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_image_templates: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          kind: string
          name: string
          prompt: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          kind: string
          name: string
          prompt?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          name?: string
          prompt?: string | null
        }
        Relationships: []
      }
      crm_journey_edges: {
        Row: {
          branch: string | null
          condition: Json
          created_at: string
          id: string
          journey_id: string
          source_step_id: string
          target_step_id: string
        }
        Insert: {
          branch?: string | null
          condition?: Json
          created_at?: string
          id?: string
          journey_id: string
          source_step_id: string
          target_step_id: string
        }
        Update: {
          branch?: string | null
          condition?: Json
          created_at?: string
          id?: string
          journey_id?: string
          source_step_id?: string
          target_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_journey_edges_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "crm_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_journey_edges_source_step_id_fkey"
            columns: ["source_step_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_journey_edges_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_journey_enrollments: {
        Row: {
          completed_at: string | null
          current_step_at: string | null
          current_step_id: string | null
          enrolled_at: string
          id: string
          journey_id: string
          metadata: Json
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step_at?: string | null
          current_step_id?: string | null
          enrolled_at?: string
          id?: string
          journey_id: string
          metadata?: Json
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step_at?: string | null
          current_step_id?: string | null
          enrolled_at?: string
          id?: string
          journey_id?: string
          metadata?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_journey_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_journey_enrollments_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "crm_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_journey_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_journey_step_events: {
        Row: {
          channel: string
          content_snapshot: Json
          conversion_order_id: string | null
          conversion_value_cents: number | null
          converted: boolean
          converted_at: string | null
          created_at: string
          enrollment_id: string
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json
          provider_message_id: string | null
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          content_snapshot?: Json
          conversion_order_id?: string | null
          conversion_value_cents?: number | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          enrollment_id: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          content_snapshot?: Json
          conversion_order_id?: string | null
          conversion_value_cents?: number | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          enrollment_id?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_journey_step_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_journey_step_events_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_journey_steps: {
        Row: {
          audience_filters: Json | null
          channel: string
          config: Json
          content: Json
          created_at: string
          delay_unit: string
          delay_value: number
          id: string
          journey_id: string
          node_type: string
          position: Json
          step_order: number | null
          updated_at: string
        }
        Insert: {
          audience_filters?: Json | null
          channel: string
          config?: Json
          content?: Json
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          journey_id: string
          node_type?: string
          position?: Json
          step_order?: number | null
          updated_at?: string
        }
        Update: {
          audience_filters?: Json | null
          channel?: string
          config?: Json
          content?: Json
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          journey_id?: string
          node_type?: string
          position?: Json
          step_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_journey_steps_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "crm_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_journey_templates: {
        Row: {
          category: string
          channel: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          steps: Json
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          channel?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          steps?: Json
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          channel?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          steps?: Json
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_journeys: {
        Row: {
          audience_filters: Json | null
          audience_id: string | null
          channel: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          stats: Json
          status: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          audience_filters?: Json | null
          audience_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          stats?: Json
          status?: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          audience_filters?: Json | null
          audience_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          stats?: Json
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_journeys_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "crm_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_journeys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_popup_deliveries: {
        Row: {
          acted_at: string | null
          content: Json
          created_at: string
          id: string
          schedule_id: string | null
          shown_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          acted_at?: string | null
          content?: Json
          created_at?: string
          id?: string
          schedule_id?: string | null
          shown_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          acted_at?: string | null
          content?: Json
          created_at?: string
          id?: string
          schedule_id?: string | null
          shown_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_popup_deliveries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "crm_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_schedule_events: {
        Row: {
          channel: string
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_identifier: string | null
          recipient_user_id: string | null
          schedule_id: string
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_identifier?: string | null
          recipient_user_id?: string | null
          schedule_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_identifier?: string | null
          recipient_user_id?: string | null
          schedule_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_schedule_events_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_schedule_events_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "crm_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_schedules: {
        Row: {
          audience_filters: Json | null
          audience_id: string | null
          channel: string
          click_count: number
          content: Json
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          id: string
          name: string
          open_count: number
          reach_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audience_filters?: Json | null
          audience_id?: string | null
          channel: string
          click_count?: number
          content?: Json
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name: string
          open_count?: number
          reach_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience_filters?: Json | null
          audience_id?: string | null
          channel?: string
          click_count?: number
          content?: Json
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name?: string
          open_count?: number
          reach_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_schedules_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "crm_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          device_id: string | null
          element: string | null
          event_id: string | null
          event_name: string
          house_id: string | null
          id: string
          metadata: Json | null
          properties: Json | null
          screen: string | null
          session_id: string | null
          user_id: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          element?: string | null
          event_id?: string | null
          event_name: string
          house_id?: string | null
          id?: string
          metadata?: Json | null
          properties?: Json | null
          screen?: string | null
          session_id?: string | null
          user_id?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          element?: string | null
          event_id?: string | null
          event_name?: string
          house_id?: string | null
          id?: string
          metadata?: Json | null
          properties?: Json | null
          screen?: string | null
          session_id?: string | null
          user_id?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          included_in_diamante: boolean
          included_in_premium: boolean
          is_addon: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          included_in_diamante?: boolean
          included_in_premium?: boolean
          is_addon?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          included_in_diamante?: boolean
          included_in_premium?: boolean
          is_addon?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      financial_events: {
        Row: {
          created_at: string
          currency: string | null
          email: string | null
          event_name: string
          id: number
          is_recurring: boolean | null
          is_test: boolean | null
          order_id: string | null
          product_id: string | null
          product_name: string | null
          raw_payload: Json
          subscription_id: string | null
          value_cents: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          email?: string | null
          event_name: string
          id?: never
          is_recurring?: boolean | null
          is_test?: boolean | null
          order_id?: string | null
          product_id?: string | null
          product_name?: string | null
          raw_payload: Json
          subscription_id?: string | null
          value_cents?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          email?: string | null
          event_name?: string
          id?: never
          is_recurring?: boolean | null
          is_test?: boolean | null
          order_id?: string | null
          product_id?: string | null
          product_name?: string | null
          raw_payload?: Json
          subscription_id?: string | null
          value_cents?: number | null
        }
        Relationships: []
      }
      funnel_analytics: {
        Row: {
          created_at: string | null
          device_id: string | null
          entity_id: string
          entity_type: string
          event_type: string
          house_id: string | null
          id: string
          session_id: string | null
          step_index: number | null
          step_option: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          house_id?: string | null
          id?: string
          session_id?: string | null
          step_index?: number | null
          step_option?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          house_id?: string | null
          id?: string
          session_id?: string | null
          step_index?: number | null
          step_option?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_analytics_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          card_id: string
          created_at: string
          id: string
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          question: string
          step_order: number
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          question: string
          step_order?: number
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          question?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
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
          betting_house_id: string | null
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
          betting_house_id?: string | null
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
          betting_house_id?: string | null
          created_at?: string
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          target?: string
          target_email?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_betting_house_id_fkey"
            columns: ["betting_house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          buyer_email: string
          buyer_name: string | null
          created_at: string
          event_name: string | null
          id: string
          is_test: boolean | null
          paid_at: string | null
          product_ids: string[] | null
          product_names: string[] | null
          provider: string
          provider_event_id: string | null
          provider_order_id: string
          raw_payload: Json | null
          status: Database["public"]["Enums"]["order_status"]
          unique_key: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          buyer_email: string
          buyer_name?: string | null
          created_at?: string
          event_name?: string | null
          id?: string
          is_test?: boolean | null
          paid_at?: string | null
          product_ids?: string[] | null
          product_names?: string[] | null
          provider: string
          provider_event_id?: string | null
          provider_order_id: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          unique_key?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          event_name?: string | null
          id?: string
          is_test?: boolean | null
          paid_at?: string | null
          product_ids?: string[] | null
          product_names?: string[] | null
          provider?: string
          provider_event_id?: string | null
          provider_order_id?: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          unique_key?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_cards: {
        Row: {
          associated_plan: string
          betting_house_id: string | null
          button_color: string | null
          checkout_config: Json | null
          checkout_final_config: Json | null
          checkout_template: string | null
          created_at: string | null
          has_intro_popup: boolean | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          popup_config: Json | null
          quiz_questions: Json | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          associated_plan: string
          betting_house_id?: string | null
          button_color?: string | null
          checkout_config?: Json | null
          checkout_final_config?: Json | null
          checkout_template?: string | null
          created_at?: string | null
          has_intro_popup?: boolean | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          popup_config?: Json | null
          quiz_questions?: Json | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          associated_plan?: string
          betting_house_id?: string | null
          button_color?: string | null
          checkout_config?: Json | null
          checkout_final_config?: Json | null
          checkout_template?: string | null
          created_at?: string | null
          has_intro_popup?: boolean | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          popup_config?: Json | null
          quiz_questions?: Json | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_cards_betting_house_id_fkey"
            columns: ["betting_house_id"]
            isOneToOne: false
            referencedRelation: "betting_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          betting_house_id: string | null
          button_color: string | null
          button_text: string | null
          button_url: string | null
          checkout_link: string | null
          checkout_link_2: string | null
          created_at: string
          final_benefits: Json | null
          final_config: Json | null
          final_template: string
          final_title: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string | null
          question_1_options: Json | null
          question_1_text: string | null
          question_2_options: Json | null
          question_2_text: string | null
          question_3_options: Json | null
          question_3_text: string | null
          subtitle: string | null
          target_audience: string
          trigger_delay_seconds: number | null
          trigger_type: string
          type: string
          updated_at: string
        }
        Insert: {
          betting_house_id?: string | null
          button_color?: string | null
          button_text?: string | null
          button_url?: string | null
          checkout_link?: string | null
          checkout_link_2?: string | null
          created_at?: string
          final_benefits?: Json | null
          final_config?: Json | null
          final_template?: string
          final_title?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          question_1_options?: Json | null
          question_1_text?: string | null
          question_2_options?: Json | null
          question_2_text?: string | null
          question_3_options?: Json | null
          question_3_text?: string | null
          subtitle?: string | null
          target_audience?: string
          trigger_delay_seconds?: number | null
          trigger_type?: string
          type: string
          updated_at?: string
        }
        Update: {
          betting_house_id?: string | null
          button_color?: string | null
          button_text?: string | null
          button_url?: string | null
          checkout_link?: string | null
          checkout_link_2?: string | null
          created_at?: string
          final_benefits?: Json | null
          final_config?: Json | null
          final_template?: string
          final_title?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          question_1_options?: Json | null
          question_1_text?: string | null
          question_2_options?: Json | null
          question_2_text?: string | null
          question_3_options?: Json | null
          question_3_text?: string | null
          subtitle?: string | null
          target_audience?: string
          trigger_delay_seconds?: number | null
          trigger_type?: string
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
      products_catalog: {
        Row: {
          active: boolean | null
          bundle_name: string | null
          checkout_url: string | null
          created_at: string | null
          entitlement_key: string | null
          id: string
          lastlink_product_uuid: string | null
          pricing: Json
          product_name: string
          product_type: string
          provider: string
          provider_product_id: string
          tier: string | null
        }
        Insert: {
          active?: boolean | null
          bundle_name?: string | null
          checkout_url?: string | null
          created_at?: string | null
          entitlement_key?: string | null
          id?: string
          lastlink_product_uuid?: string | null
          pricing?: Json
          product_name: string
          product_type?: string
          provider: string
          provider_product_id: string
          tier?: string | null
        }
        Update: {
          active?: boolean | null
          bundle_name?: string | null
          checkout_url?: string | null
          created_at?: string | null
          entitlement_key?: string | null
          id?: string
          lastlink_product_uuid?: string | null
          pricing?: Json
          product_name?: string
          product_type?: string
          provider?: string
          provider_product_id?: string
          tier?: string | null
        }
        Relationships: []
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
      raw_webhook_logs: {
        Row: {
          created_at: string
          id: number
          payload: Json | null
        }
        Insert: {
          created_at?: string
          id?: number
          payload?: Json | null
        }
        Update: {
          created_at?: string
          id?: number
          payload?: Json | null
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
      special_achievement_entries: {
        Row: {
          achievement_id: string
          created_at: string | null
          entry_id: string
          id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          achievement_id?: string
          created_at?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_achievement_entries_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
      user_achievements: {
        Row: {
          achievement_date: string | null
          achievement_id: string
          granted_by: string | null
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_date?: string | null
          achievement_id: string
          granted_by?: string | null
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_date?: string | null
          achievement_id?: string
          granted_by?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          message: string
          screenshot_url: string | null
          source: string
          status: string
          tip_cache_id: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email: string
          id?: string
          message: string
          screenshot_url?: string | null
          source?: string
          status?: string
          tip_cache_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          screenshot_url?: string | null
          source?: string
          status?: string
          tip_cache_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_tip_cache_id_fkey"
            columns: ["tip_cache_id"]
            isOneToOne: false
            referencedRelation: "ai_tip_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      user_popup_views: {
        Row: {
          id: string
          popup_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          popup_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          popup_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_popup_views_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "popups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_popup_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
          discount_used: boolean
          email: string
          first_access_at: string | null
          id: string
          last_event_at: string | null
          last_seen_at: string | null
          main_tier: Database["public"]["Enums"]["main_tier"]
          nickname: string | null
          origin: string | null
          phone: string | null
        }
        Insert: {
          avatar_id?: string | null
          betting_house_id?: string | null
          created_at?: string
          discount_used?: boolean
          email: string
          first_access_at?: string | null
          id?: string
          last_event_at?: string | null
          last_seen_at?: string | null
          main_tier?: Database["public"]["Enums"]["main_tier"]
          nickname?: string | null
          origin?: string | null
          phone?: string | null
        }
        Update: {
          avatar_id?: string | null
          betting_house_id?: string | null
          created_at?: string
          discount_used?: boolean
          email?: string
          first_access_at?: string | null
          id?: string
          last_event_at?: string | null
          last_seen_at?: string | null
          main_tier?: Database["public"]["Enums"]["main_tier"]
          nickname?: string | null
          origin?: string | null
          phone?: string | null
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
      users_pending_review: {
        Row: {
          created_at: string
          email: string
          legacy_main_tier: Database["public"]["Enums"]["main_tier"]
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          legacy_main_tier: Database["public"]["Enums"]["main_tier"]
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          legacy_main_tier?: Database["public"]["Enums"]["main_tier"]
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      users_premigration_snapshot: {
        Row: {
          betting_house_id: string | null
          created_at: string | null
          email: string | null
          first_access_at: string | null
          id: string | null
          last_seen_at: string | null
          legacy_main_tier: Database["public"]["Enums"]["main_tier"] | null
          origin: string | null
          snapshot_taken_at: string | null
        }
        Insert: {
          betting_house_id?: string | null
          created_at?: string | null
          email?: string | null
          first_access_at?: string | null
          id?: string | null
          last_seen_at?: string | null
          legacy_main_tier?: Database["public"]["Enums"]["main_tier"] | null
          origin?: string | null
          snapshot_taken_at?: string | null
        }
        Update: {
          betting_house_id?: string | null
          created_at?: string | null
          email?: string | null
          first_access_at?: string | null
          id?: string | null
          last_seen_at?: string | null
          legacy_main_tier?: Database["public"]["Enums"]["main_tier"] | null
          origin?: string | null
          snapshot_taken_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          buyer_email: string | null
          error_message: string | null
          event_name: string | null
          id: string
          is_test: boolean | null
          processed_ok: boolean
          provider: string
          provider_event_id: string | null
          raw_payload: Json | null
          received_at: string
          unique_key: string | null
        }
        Insert: {
          buyer_email?: string | null
          error_message?: string | null
          event_name?: string | null
          id?: string
          is_test?: boolean | null
          processed_ok?: boolean
          provider: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          unique_key?: string | null
        }
        Update: {
          buyer_email?: string | null
          error_message?: string | null
          event_name?: string | null
          id?: string
          is_test?: boolean | null
          processed_ok?: boolean
          provider?: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          unique_key?: string | null
        }
        Relationships: []
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
      admin_replay_payt_webhook:
        | { Args: { p_log_id: string }; Returns: Json }
        | { Args: { p_force?: boolean; p_log_id: string }; Returns: Json }
      check_and_debit_credit: {
        Args: { p_source: string; p_user_id: string }
        Returns: Json
      }
      check_is_admin_email: { Args: { p_email: string }; Returns: boolean }
      crm_clear_channel_secret: {
        Args: { p_channel: string; p_key: string }
        Returns: Json
      }
      crm_get_channel_secret: {
        Args: { p_channel: string; p_key: string }
        Returns: string
      }
      crm_process_pending_schedules: {
        Args: never
        Returns: {
          dispatched_id: string
        }[]
      }
      crm_save_channel_secret: {
        Args: { p_channel: string; p_key: string; p_value: string }
        Returns: Json
      }
      get_ai_telemetry_dashboard: {
        Args: { p_period_days?: number }
        Returns: Json
      }
      get_ai_tipster_status: { Args: never; Returns: Json }
      get_allowed_tiers: {
        Args: { user_tier: Database["public"]["Enums"]["main_tier"] }
        Returns: Database["public"]["Enums"]["main_tier"][]
      }
      get_credit_balance: { Args: { p_user_id: string }; Returns: Json }
      get_daily_ai_cost_usd: { Args: never; Returns: number }
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
      get_or_create_user:
        | {
            Args: { p_email: string }
            Returns: {
              avatar_id: string | null
              betting_house_id: string | null
              created_at: string
              discount_used: boolean
              email: string
              first_access_at: string | null
              id: string
              last_event_at: string | null
              last_seen_at: string | null
              main_tier: Database["public"]["Enums"]["main_tier"]
              nickname: string | null
              origin: string | null
              phone: string | null
            }
            SetofOptions: {
              from: "*"
              to: "users"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p_email: string; p_phone?: string }
            Returns: {
              avatar_id: string | null
              betting_house_id: string | null
              created_at: string
              discount_used: boolean
              email: string
              first_access_at: string | null
              id: string
              last_event_at: string | null
              last_seen_at: string | null
              main_tier: Database["public"]["Enums"]["main_tier"]
              nickname: string | null
              origin: string | null
              phone: string | null
            }
            SetofOptions: {
              from: "*"
              to: "users"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      grant_bonus_credits: {
        Args: {
          p_admin_id?: string
          p_amount: number
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      grant_purchased_credits: {
        Args: { p_amount: number; p_purchase_id?: string; p_user_id: string }
        Returns: Json
      }
      grant_unlimited_access: {
        Args: { p_days: number; p_purchase_id?: string; p_user_id: string }
        Returns: Json
      }
      has_active_entitlement: {
        Args: {
          p_product: Database["public"]["Enums"]["product_key"]
          p_user_id: string
        }
        Returns: boolean
      }
      increment_tip_hit: { Args: { p_tip_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      refund_credit:
        | {
            Args: { p_debit_type: string; p_source: string; p_user_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_debit_type: string
              p_reason?: string
              p_source: string
              p_user_id: string
            }
            Returns: Json
          }
      update_user_access: {
        Args: { p_now: string; p_user_id: string }
        Returns: undefined
      }
      user_has_feature: {
        Args: { p_feature: string; p_user: string }
        Returns: boolean
      }
    }
    Enums: {
      entitlement_source: "purchase" | "manual" | "admin"
      entitlement_status: "active" | "expired" | "revoked"
      main_tier: "free" | "basic" | "pro" | "ultra" | "premium" | "diamante"
      order_status: "paid" | "refunded" | "chargeback"
      product_key:
        | "alavancagem"
        | "desaltas"
        | "live_telegram"
        | "acesso_vitalicio"
        | "odds_safes"
        | "odds_pro"
        | "multiplas_bingo"
        | "mercados_secundarios"
        | "esportes_americanos"
        | "odds_ultra"
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
      main_tier: ["free", "basic", "pro", "ultra", "premium", "diamante"],
      order_status: ["paid", "refunded", "chargeback"],
      product_key: [
        "alavancagem",
        "desaltas",
        "live_telegram",
        "acesso_vitalicio",
        "odds_safes",
        "odds_pro",
        "multiplas_bingo",
        "mercados_secundarios",
        "esportes_americanos",
        "odds_ultra",
      ],
    },
  },
} as const
