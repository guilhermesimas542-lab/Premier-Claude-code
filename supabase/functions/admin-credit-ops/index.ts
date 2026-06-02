// Admin-only credit ops: grant_bonus, grant_unlimited, get_balance
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "missing_auth" }, 401);

  // Verify caller is admin via their JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: isAdminData, error: adminErr } = await userClient.rpc("is_admin");
  if (adminErr || isAdminData !== true) {
    return json({ error: "forbidden" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const { action, user_id } = body ?? {};
  if (!action || !user_id || typeof user_id !== "string") {
    return json({ error: "missing_fields" }, 400);
  }

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

  const fetchBalance = async () => {
    const { data, error } = await svc.rpc("get_credit_balance", { p_user_id: user_id });
    if (error) return { error: error.message };
    return data;
  };

  try {
    if (action === "get_balance") {
      const data = await fetchBalance();
      return json({ ok: true, balance: data });
    }

    if (action === "grant_bonus") {
      const amount = Number(body.amount);
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100) {
        return json({ error: "invalid_amount" }, 400);
      }
      const reason = typeof body.reason === "string" && body.reason ? body.reason : "admin_manual";
      const { data, error } = await svc.rpc("grant_bonus_credits", {
        p_user_id: user_id, p_amount: amount, p_admin_id: null, p_reason: reason,
      });
      if (error) return json({ error: error.message }, 500);
      const balance = await fetchBalance();
      return json({ ok: true, result: data, balance });
    }

    if (action === "grant_unlimited") {
      const dur = body.duration;
      const map: Record<string, number> = { "30d": 30, "90d": 90, "lifetime": 3650000 };
      const days = map[dur];
      if (!days) return json({ error: "invalid_duration" }, 400);
      const { data, error } = await svc.rpc("grant_unlimited_access", {
        p_user_id: user_id, p_days: days, p_purchase_id: null,
      });
      if (error) return json({ error: error.message }, 500);
      const balance = await fetchBalance();
      return json({ ok: true, result: data, balance });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
