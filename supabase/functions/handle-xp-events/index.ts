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
  VIEW_BASIC_TIP: 0,
  VIEW_ULTRA_TIP: 0,
  VIEW_ALAV_TIP: 0,
  VIEW_ODDS_TIP: 0,
  VIEW_ANY_TIP: 0,
  VIEW_FREE_TIP: 0,
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

const STREAK_BONUSES: Record<number, number> = {
  3: 5, 7: 15, 14: 25, 30: 50, 60: 100, 100: 200,
};

const DAILY_EVENT_MAP: Record<string, string> = {
  VIEW_ANY_TIP: 'daily_hunter',
  VIEW_BASIC_TIP: 'daily_basic',
  VIEW_ULTRA_TIP: 'daily_ultra',
  VIEW_ALAV_TIP: 'daily_alav',
  VIEW_ODDS_TIP: 'daily_odds',
  VIEW_FREE_TIP: 'daily_free',
};

function calculateLevel(xp: number): number {
  const levels = [
    { level: 10, xp: 4500 }, { level: 9, xp: 3600 }, { level: 8, xp: 2800 },
    { level: 7, xp: 2100 }, { level: 6, xp: 1500 }, { level: 5, xp: 1000 },
    { level: 4, xp: 600 }, { level: 3, xp: 300 }, { level: 2, xp: 100 },
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

async function grantDailyAchievement(userId: string, achievementId: string, supabaseAdmin: any) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseAdmin
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .eq('achievement_date', today)
    .maybeSingle();

  if (existing) return null;

  const { data: achievement } = await supabaseAdmin
    .from('achievements')
    .select('xp_reward, name, icon')
    .eq('id', achievementId)
    .eq('is_active', true)
    .maybeSingle();

  if (!achievement) return null;

  const { error: insertError } = await supabaseAdmin
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievementId, achievement_date: today });

  if (insertError) {
    console.error(`[grantDaily] Erro ao inserir achievement ${achievementId} para user ${userId}:`, insertError.message);
    return null;
  }

  return achievement;
}

async function checkStreakAchievements(userId: string, currentStreak: number, supabaseAdmin: any) {
  const granted: any[] = [];

  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      const achievementId = `streak_${milestone}`;

      const { data: existing } = await supabaseAdmin
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .is('achievement_date', null)
        .maybeSingle();

      if (!existing) {
        const { data: achievement } = await supabaseAdmin
          .from('achievements')
          .select('xp_reward, name, icon')
          .eq('id', achievementId)
          .eq('is_active', true)
          .maybeSingle();

        if (achievement) {
          const { error: insertError } = await supabaseAdmin
            .from('user_achievements')
            .insert({ user_id: userId, achievement_id: achievementId, achievement_date: null });

          if (insertError) {
            console.error(`[checkStreak] Erro ao inserir achievement ${achievementId} para user ${userId}:`, insertError.message);
          } else {
            granted.push({ id: achievementId, ...achievement });
          }
        }
      }
    }
  }

  return granted;
}

async function checkPermanentAchievements(userId: string, supabaseAdmin: any) {
  const granted: any[] = [];

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('main_tier, nickname, avatar_id')
    .eq('id', userId)
    .maybeSingle();

  if (!user) return granted;

  const { data: entitlements } = await supabaseAdmin
    .from('entitlements')
    .select('product_key')
    .eq('user_id', userId)
    .eq('status', 'active');

  const activeKeys = (entitlements ?? []).map((e: any) => e.product_key);

  const { data: grantedAchievements } = await supabaseAdmin
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .is('achievement_date', null);

  const grantedIds = new Set((grantedAchievements ?? []).map((a: any) => a.achievement_id));

  const { data: permanentAchievements } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .eq('category', 'permanent')
    .eq('is_active', true);

  for (const ach of (permanentAchievements ?? [])) {
    if (grantedIds.has(ach.id)) continue;

    let shouldGrant = false;

    if (ach.condition_type === 'first_login') {
      shouldGrant = true;
    } else if (ach.condition_type === 'profile_complete') {
      shouldGrant = !!user.nickname && user.avatar_id && user.avatar_id !== 'avatar_default_1';
    } else if (ach.condition_type === 'has_plan') {
      const plans = ach.condition_value?.plans || [];
      shouldGrant = plans.includes(user.main_tier);
    } else if (ach.condition_type === 'has_entitlement') {
      const key = ach.condition_value?.key;
      shouldGrant = activeKeys.includes(key);
    }

    if (shouldGrant) {
      const { error: insertError } = await supabaseAdmin
        .from('user_achievements')
        .insert({ user_id: userId, achievement_id: ach.id, achievement_date: null });

      if (insertError) {
        console.error(`[checkPermanent] Erro ao inserir achievement ${ach.id} para user ${userId}:`, insertError.message);
      } else {
        granted.push({ id: ach.id, name: ach.name, icon: ach.icon, xp_reward: ach.xp_reward });
      }
    }
  }

  return granted;
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
    const newAchievements: any[] = [];

    if (event === 'DAILY_LOGIN') {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = gamification?.last_login_date;

      if (lastLogin !== today) {
        xpToAdd += XP_EVENTS.DAILY_LOGIN;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const currentStreak = lastLogin === yesterday ? (gamification?.current_streak || 0) + 1 : 1;

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

        const dailyResult = await grantDailyAchievement(userId, 'daily_checkin', supabaseAdmin);
        if (dailyResult) {
          xpToAdd += dailyResult.xp_reward;
          newAchievements.push({ id: 'daily_checkin', ...dailyResult });
        }

        const streakAchievements = await checkStreakAchievements(userId, currentStreak, supabaseAdmin);
        for (const sa of streakAchievements) {
          xpToAdd += sa.xp_reward;
          newAchievements.push(sa);
        }

        const permAchievements = await checkPermanentAchievements(userId, supabaseAdmin);
        for (const pa of permAchievements) {
          xpToAdd += pa.xp_reward;
          newAchievements.push(pa);
        }
      } else {
        return new Response(
          JSON.stringify({ success: true, xpAdded: 0, alreadyLoggedToday: true, gamification, newAchievements: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (event === 'COMPLETE_PROFILE') {
      // Give XP AND check permanent achievements (profile_complete)
      xpToAdd = XP_EVENTS[event] || 0;
      const permAchievements = await checkPermanentAchievements(userId, supabaseAdmin);
      for (const pa of permAchievements) {
        xpToAdd += pa.xp_reward;
        newAchievements.push(pa);
      }
    } else if (DAILY_EVENT_MAP[event]) {
      const dailyAchId = DAILY_EVENT_MAP[event];
      const dailyResult = await grantDailyAchievement(userId, dailyAchId, supabaseAdmin);
      if (dailyResult) {
        xpToAdd += dailyResult.xp_reward;
        newAchievements.push({ id: dailyAchId, ...dailyResult });
      }
      if (event !== 'VIEW_ANY_TIP') {
        const hunterResult = await grantDailyAchievement(userId, 'daily_hunter', supabaseAdmin);
        if (hunterResult) {
          xpToAdd += hunterResult.xp_reward;
          newAchievements.push({ id: 'daily_hunter', ...hunterResult });
        }
      }
      xpToAdd += XP_EVENTS[event] || 0;
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

      await supabaseAdmin
        .from('xp_events')
        .insert({
          user_id: userId,
          event_type: event,
          xp_amount: xpToAdd,
        });

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
          newAchievements,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, xpAdded: 0, gamification, newAchievements }),
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
