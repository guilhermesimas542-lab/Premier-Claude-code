// Beta allowlist — agora alimentado pela tabela public.ai_beta_allowlist.
// Para adicionar/remover emails, edite a tabela no admin (sem deploy).
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, boolean>();

export async function isAIBetaUser(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (cache.has(e)) return cache.get(e)!;
  try {
    const { data } = await supabase
      .from("ai_beta_allowlist" as any)
      .select("id")
      .eq("email", e)
      .maybeSingle();
    const allowed = !!data;
    cache.set(e, allowed);
    return allowed;
  } catch {
    return false;
  }
}
