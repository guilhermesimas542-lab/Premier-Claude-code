import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "no_service_key_env" }), { status: 500 });
  }
  const supa = createClient(url, serviceKey);
  const { data, error } = await supa.rpc("seed_service_role_key", { p_value: serviceKey });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data));
});
