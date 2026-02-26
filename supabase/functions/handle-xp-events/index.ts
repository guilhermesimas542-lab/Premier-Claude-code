import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const XP_EVENTS: Record<string, number> = {
  DAILY_LOGIN: 10,
  ADD_TIP_TO_BETSLIP: 5,
  COMPLETE_PROFILE: 50,
  UPGRADE_PLAN: 500,
  INVITE_FRIEND: 100,
  VIEW_GREEN: 2,
};

const STREAK_BONUSES: Record<number, number> = {
  3: 5,
  7: 15,
  14: 25,
  30: 50,
  60: 100,
  100: 200,
};

function calculateLevel(xp: number): number {
  const levels = [
    { level: 10, xp: 4500 },
    { level: 9, xp: 3600 },
    { level: 8, xp: 2800 },
    { level: 7, xp: 2100 },
    { level: 6, xp: 1500 },
    { level: 5, xp: 1000 },
    { level: 4, xp: 600 },
    { level: 3, xp: 300 },
    { level: 2, xp: 100 },
  ];
  for (const l of levels) {
    if (xp >= l.xp) return l.level;
  }
  return 1;
}

function getXpForLevel(level: number): number {
  const thresholds: Record<number, number> = {
    1: 0, 2: 100, 3: 300, 4: 600, 5: 1000,
    6: 1500, 7: 2100, 8: 2800, 9: 3600, 10: 4500,
  };
  return thresholds[level] || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, userId } = await req.json();

    if (!event || !userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'event and userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get or create gamification record
    let { data: gamification } = await supabaseAdmin
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!gamification) {
      const { data: newRecord } = await supabaseAdmin
        .from('user_gamification')
        .insert({ user_id: userId })
        .select()
        .single();
      gamification = newRecord;
    }

    let xpToAdd = 0;
    let streakData: Record<string, any> = {};
    let streakBonus = 0;
    let leveledUp = false;

    if (event === 'DAILY_LOGIN') {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = gamification?.last_login_date;

      if (lastLogin !== today) {
        xpToAdd += XP_EVENTS.DAILY_LOGIN;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const currentStreak = lastLogin === yesterday ? (gamification?.current_streak || 0) + 1 : 1;

        // Streak bonuses
        if (STREAK_BONUSES[currentStreak]) {
          streakBonus = STREAK_BONUSES[currentStreak];
          xpToAdd += streakBonus;
        }

        streakData = {
          current_streak: currentStreak,
          longest_streak: Math.max(gamification?.longest_streak || 0, currentStreak),
          last_login_date: today,
          total_logins: (gamification?.total_logins || 0) + 1,
        };
      } else {
        // Already logged in today
        return new Response(
          JSON.stringify({ success: true, xpAdded: 0, alreadyLoggedToday: true, gamification }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      xpToAdd = XP_EVENTS[event] || 0;
    }

    if (xpToAdd > 0) {
      const oldLevel = gamification?.current_level || 1;
      const newTotalXp = (gamification?.total_xp || 0) + xpToAdd;
      const newLevel = calculateLevel(newTotalXp);
      leveledUp = newLevel > oldLevel;

      await supabaseAdmin
        .from('user_gamification')
        .update({
          total_xp: newTotalXp,
          current_level: newLevel,
          ...streakData,
        })
        .eq('user_id', userId);

      // Log XP event
      await supabaseAdmin
        .from('xp_events')
        .insert({
          user_id: userId,
          event_type: event,
          xp_amount: xpToAdd,
        });

      // Refresh data
      const { data: updated } = await supabaseAdmin
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          xpAdded: xpToAdd,
          streakBonus,
          leveledUp,
          oldLevel,
          newLevel,
          gamification: updated,
          nextLevelXp: getXpForLevel(newLevel + 1),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, xpAdded: 0, gamification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-xp-events:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
