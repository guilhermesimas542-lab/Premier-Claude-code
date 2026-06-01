// Edge function temporária — grava SUPABASE_SERVICE_ROLE_KEY no Vault como 'service_role_key'.
// Pode ser removida após a primeira execução bem-sucedida.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "no_service_key_env" }), { status: 500 });
  }
  const supa = createClient(url, serviceKey);

  // Verifica se já existe
  const { data: existing, error: selErr } = await supa
    .schema("vault" as any)
    .from("secrets")
    .select("id, name")
    .eq("name", "service_role_key")
    .maybeSingle();

  if (selErr) {
    return new Response(JSON.stringify({ ok: false, step: "select", error: selErr.message }), { status: 500 });
  }

  if (existing?.id) {
    const { error: updErr } = await supa.rpc("update_secret" as any, {
      secret_id: existing.id,
      new_secret: serviceKey,
      new_name: "service_role_key",
      new_description: "CRM cron service role key",
    });
    if (updErr) {
      return new Response(JSON.stringify({ ok: false, step: "update", error: updErr.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, action: "updated", id: existing.id }));
  }

  const { data: created, error: insErr } = await supa.rpc("create_secret" as any, {
    new_secret: serviceKey,
    new_name: "service_role_key",
    new_description: "CRM cron service role key",
  });
  if (insErr) {
    return new Response(JSON.stringify({ ok: false, step: "create", error: insErr.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, action: "created", id: created }));
});
