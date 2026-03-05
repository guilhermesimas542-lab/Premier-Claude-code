import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserBettingHouse } from "./useUserBettingHouse";
import type { PayCardData } from "./usePayCards";
import { mockGetUser } from "@/mocks/user";

/** Parse the target_audience field (JSON array string or legacy single string) */
function parseAudience(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return val ? [val] : [];
}

/** Check if a user matches ALL audience criteria (AND logic) */
async function matchesAudience(
  criteria: string[],
  userTier: string,
  isVitalicio: boolean,
  activeAddons: string[],
): Promise<boolean> {
  // No criteria = don't show (explicit selection required)
  if (criteria.length === 0) return false;

  for (const c of criteria) {
    switch (c) {
      case "all":
        break; // always true
      case "all_paid":
        if (userTier === "free") return false;
        break;
      case "all_free":
        if (userTier !== "free") return false;
        break;
      case "has_basic":
        if (userTier !== "basic") return false;
        break;
      case "no_basic":
        if (userTier === "basic") return false;
        break;
      case "has_pro":
        if (userTier !== "pro") return false;
        break;
      case "no_pro":
        if (userTier === "pro") return false;
        break;
      case "has_ultra":
        if (userTier !== "ultra") return false;
        break;
      case "no_ultra":
        if (userTier === "ultra") return false;
        break;
      case "has_vitalicio":
        if (!isVitalicio) return false;
        break;
      case "no_vitalicio":
        if (isVitalicio) return false;
        break;
      case "has_alavancagem":
        if (!activeAddons.includes("alavancagem")) return false;
        break;
      case "no_alavancagem":
        if (activeAddons.includes("alavancagem")) return false;
        break;
      case "has_desaltas":
        if (!activeAddons.includes("desaltas")) return false;
        break;
      case "no_desaltas":
        if (activeAddons.includes("desaltas")) return false;
        break;
      case "has_live_telegram":
        if (!activeAddons.includes("live_telegram")) return false;
        break;
      case "no_live_telegram":
        if (activeAddons.includes("live_telegram")) return false;
        break;
      default:
        // Unknown criterion — skip (backwards compat with legacy string values)
        break;
    }
  }
  return true;
}

export function usePayCardTrigger() {
  const { house } = useUserBettingHouse();
  const [payCard, setPayCard] = useState<PayCardData | null>(null);
  const [open, setOpen] = useState(false);

  const triggerPayCard = useCallback(async (plan: string) => {
    // Fetch user data for audience matching
    const mockUser = mockGetUser();
    let userTier = "free";
    let isVitalicio = false;
    let activeAddons: string[] = [];

    if (mockUser?.email) {
      const { data: userData } = await supabase
        .from("users")
        .select("id, main_tier, is_vitalicio")
        .eq("email", mockUser.email.toLowerCase().trim())
        .maybeSingle();
      if (userData) {
        userTier = userData.main_tier;
        isVitalicio = userData.is_vitalicio;
        const { data: ents } = await supabase
          .from("entitlements")
          .select("product_key")
          .eq("user_id", userData.id)
          .eq("status", "active");
        activeAddons = (ents ?? []).map((e: any) => e.product_key);
      }
    }

    // Helper to check audience match
    const checkAudience = async (card: any): Promise<boolean> => {
      const criteria = parseAudience(card.target_audience);
      if (criteria.length === 0) return true; // No criteria = show to all (backwards compat for direct triggers)
      return matchesAudience(criteria, userTier, isVitalicio, activeAddons);
    };

    // 1. Try house-specific pay card
    if (house?.id) {
      const { data } = await supabase
        .from("pay_cards" as any)
        .select("*")
        .eq("associated_plan", plan)
        .eq("betting_house_id", house.id)
        .eq("is_active", true)
        .limit(10);
      
      for (const card of (data ?? []) as any[]) {
        if (await checkAudience(card)) {
          setPayCard(card as any as PayCardData);
          setOpen(true);
          return true;
        }
      }
    }

    // 2. Fallback to generic (null house)
    const { data: generic } = await supabase
      .from("pay_cards" as any)
      .select("*")
      .eq("associated_plan", plan)
      .is("betting_house_id", null)
      .eq("is_active", true)
      .limit(10);

    for (const card of (generic ?? []) as any[]) {
      if (await checkAudience(card)) {
        setPayCard(card as any as PayCardData);
        setOpen(true);
        return true;
      }
    }

    console.warn(`[usePayCardTrigger] No matching pay card found for plan: ${plan}`);
    return false;
  }, [house?.id]);

  const closePayCard = useCallback(() => {
    setOpen(false);
    setPayCard(null);
  }, []);

  return { triggerPayCard, payCard, open, closePayCard };
}
