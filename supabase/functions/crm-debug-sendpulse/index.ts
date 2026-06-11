// Debug: consulta status de uma campanha SendPulse Telegram pelo ID.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { campaign_id } = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: apiIdData }, { data: apiSecretData }, { data: settingsRow }] = await Promise.all([
      supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_x1", p_key: "api_id" }),
      supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_x1", p_key: "api_secret" }),
      supabase.from("crm_channel_settings").select("config").eq("channel", "telegram_x1").maybeSingle(),
    ]);

    const apiId = apiIdData as string;
    const apiSecret = apiSecretData as string;
    const botId = (settingsRow as any)?.config?.channel_id;

    const t = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: apiId, client_secret: apiSecret }),
    });
    const tj = await t.json();
    if (!tj?.access_token) {
      return new Response(JSON.stringify({ step: "auth", ok: false, tj }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = tj.access_token;

    async function hit(path: string) {
      const r = await fetch(`https://api.sendpulse.com${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { path, status: r.status, body: await r.json().catch(() => ({})) };
    }

    const results = await Promise.all([
      hit(`/telegram/bots`),
      hit(`/telegram/contacts/getList?bot_id=${botId}&limit=1`),
      hit(`/telegram/subscribers?bot_id=${botId}&limit=1`),
      hit(`/telegram/bots/${botId}`),
      hit(`/telegram/campaigns/list?limit=5`),
      hit(`/telegram/campaigns?limit=5`),
      hit(`/user/info`),
      hit(`/messengers/bots`),
    ]);

    let campaignProbe: any = null;
    if (campaign_id) {
      campaignProbe = await hit(`/telegram/campaigns/${campaign_id}`);
    }

    return new Response(JSON.stringify({
      bot_id: botId,
      token_ok: true,
      probes: results,
      campaign_probe: campaignProbe,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
