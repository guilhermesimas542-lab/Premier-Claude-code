import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("[auth] missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user?.email) {
      console.error("[auth] JWT validation failed", authError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userEmail = authData.user.email;

    const { data: adminCheck, error: adminError } = await supabase
      .from("admin_emails")
      .select("email")
      .eq("email", userEmail)
      .maybeSingle();
    if (adminError) {
      console.error("[auth] admin lookup error", adminError);
      return new Response(JSON.stringify({ error: "Lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!adminCheck) {
      console.error("[auth] not admin", { email: userEmail });
      return new Response(JSON.stringify({ error: "Forbidden — not admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiResp = await fetch("https://v3.football.api-sports.io/status", {
      headers: {
        "x-apisports-key": API_FOOTBALL_KEY,
      },
    });

    if (!apiResp.ok) {
      return new Response(
        JSON.stringify({
          error: "API-Football error",
          status: apiResp.status,
          body: await apiResp.text(),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await apiResp.json();
    const requests = data?.response?.requests ?? {};
    const subscription = data?.response?.subscription ?? {};

    return new Response(
      JSON.stringify({
        current: requests.current ?? 0,
        limit_day: requests.limit_day ?? 0,
        plan: subscription.plan ?? null,
        end_subscription: subscription.end ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("admin-api-football-status error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
