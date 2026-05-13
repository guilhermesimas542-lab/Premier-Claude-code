// Resolve altenar_event_id e altenar_event_url para uma fixture
// da API-Football. Retorna null se não houver mapeamento.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AltenarMapping {
  altenar_event_id: string;
  altenar_event_url: string | null;
}

export async function lookupAltenarMapping(
  supabase: ReturnType<typeof createClient>,
  apiFootballFixtureId: number
): Promise<AltenarMapping | null> {
  if (!apiFootballFixtureId) return null;
  try {
    const { data, error } = await supabase
      .from("ai_match_altenar_map")
      .select("altenar_event_id, altenar_event_url")
      .eq("api_football_fixture_id", apiFootballFixtureId)
      .maybeSingle();
    if (error) {
      console.error("lookupAltenarMapping error", error);
      return null;
    }
    if (!data?.altenar_event_id) return null;
    return {
      altenar_event_id: data.altenar_event_id,
      altenar_event_url: data.altenar_event_url ?? null,
    };
  } catch (e) {
    console.error("lookupAltenarMapping exception", e);
    return null;
  }
}
