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

    // Bot info
    const bot = await fetch(`https://api.sendpulse.com/telegram/bots/${botId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const botJson = await bot.json().catch(() => ({}));

    // Bot subscribers count
    const subs = await fetch(`https://api.sendpulse.com/telegram/subscribers?bot_id=${botId}&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const subsJson = await subs.json().catch(() => ({}));

    // Campaign info if id provided
    let campaignJson: any = null;
    if (campaign_id) {
      const camp = await fetch(`https://api.sendpulse.com/telegram/campaigns/${campaign_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      campaignJson = { status: camp.status, body: await camp.json().catch(() => ({})) };
    }

    // List recent campaigns
    const list = await fetch(`https://api.sendpulse.com/telegram/campaigns?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listJson = await list.json().catch(() => ({}));

    return new Response(JSON.stringify({
      bot_id: botId,
      bot: botJson,
      subscribers: subsJson,
      campaign: campaignJson,
      recent_campaigns: listJson,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
