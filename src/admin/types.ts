export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  target: string;
  target_email: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AdminContentEntry {
  id: string;
  title: string;
  date: string;
  market: string | null;
  odd: number | null;
  tier_required: string;
  addon_required: string | null;
  active: boolean;
  metadata: any;
  created_at: string;
  starts_at: string | null;
  expires_at: string | null;
  team1_name: string | null;
  team1_shirt_variant: string | null;
  team1_primary_color: string | null;
  team1_secondary_color: string | null;
  team2_name: string | null;
  team2_shirt_variant: string | null;
  team2_primary_color: string | null;
  team2_secondary_color: string | null;
  category: string | null;
  category_explanation: string | null;
  condition_to_win: string | null;
  classification: string | null;
  justification: string | null;
  link: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  main_tier: string;
  created_at: string;
  last_seen_at: string | null;
  last_event_at: string | null;
}

export interface AdminSession {
  id: string;
  user_id: string;
  session_start_at: string;
  session_end_at: string | null;
  duration_seconds: number | null;
  last_heartbeat_at: string | null;
  created_at: string;
}

export interface AdminEvent {
  id: string;
  user_id: string | null;
  event_name: string;
  metadata: any;
  created_at: string;
}
