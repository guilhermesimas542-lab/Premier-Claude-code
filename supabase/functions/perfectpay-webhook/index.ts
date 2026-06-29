// supabase/functions/perfectpay-webhook/index.ts
//
// Webhook do PerfectPay/CenterPag → LIBERA O PLANO no banco + dispara e-mail.
//
// Fluxo:
//   1. Recebe POST do PerfectPay
//   2. Valida que a venda está "approved" (status vem em sale_status_enum_key)
//   3. Extrai customer.email + plan.name + product.name
//   4. Mapeia o plano comprado -> tier e SOBE o main_tier do usuário no banco
//      (acha ou cria o usuário pelo email; só promove, nunca rebaixa)
//   5. Envia e-mail de acesso via Resend
//   6. Retorna 200 OK pro PerfectPay confirmar recebimento
//
// Env vars necessárias (configurar no Supabase):
//   - RESEND_API_KEY            (chave da API do Resend)
//   - RESEND_FROM               (ex: "acesso@clscore.app")
//   - SUPABASE_URL              (injetado automaticamente no Edge runtime)
//   - SUPABASE_SERVICE_ROLE_KEY (injetado automaticamente no Edge runtime)

// deno-lint-ignore-file no-explicit-any
// @ts-ignore Deno é resolvido no runtime do Supabase Edge Functions
declare const Deno: { env: { get(k: string): string | undefined } };

// @ts-ignore resolvido no runtime do Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PerfectPayPayload {
  customer?: { email?: string; name?: string; phone_formated_ddi?: string };
  product?: { name?: string; code?: string };
  plan?: { name?: string; code?: string };
  // Formato real do PerfectPay/CenterPag: status vem no top-level, não em sale.status
  sale_status_enum_key?: string;
  sale_status_detail?: string;
  // Formato legado (mantido por compatibilidade)
  sale?: { status?: string; id?: string | number; code?: string };
}

// Hierarquia de tiers (mesmo ranking usado pela payment-webhook).
const TIER_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  premium: 3,
  ultra: 4,
  diamante: 5,
};

// Mapeia o nome do plano comprado no PerfectPay -> tier do app.
// Hoje o Chile só vende "PREMIUM $9,90" (=> premium). O match por nome
// faz planos novos (ex: "DIAMANTE ...") já caírem no tier certo sozinhos.
// Default = premium, porque é o único plano pago que existe hoje.
function mapPlanToTier(planName?: string, productName?: string): string {
  const s = `${planName ?? ""} ${productName ?? ""}`.toLowerCase();
  if (/diamante|diamond/.test(s)) return "diamante";
  if (/ultra/.test(s)) return "ultra";
  if (/premium/.test(s)) return "premium";
  if (/\bpro\b/.test(s)) return "pro";
  if (/b[aá]sico|basic/.test(s)) return "basic";
  return "premium";
}

// Libera o tier no banco: acha/cria o usuário pelo email e sobe o main_tier.
// Só promove (nunca rebaixa), igual ao guard da payment-webhook.
async function grantTier(
  email: string,
  planName?: string,
  productName?: string,
  phone?: string,
): Promise<{ ok: boolean; tier?: string; action?: string; error?: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return { ok: false, error: "SUPABASE_URL/SERVICE_ROLE_KEY ausente" };

  const supabase = createClient(url, serviceKey);
  const tier = mapPlanToTier(planName, productName);

  // Acha ou cria o usuário pelo email (mesmo RPC que a payment-webhook usa).
  const { data: userData, error: userErr } = await supabase.rpc("get_or_create_user", {
    p_email: email,
    p_phone: phone ?? null,
  });
  const userId = (userData as any)?.id ?? null;
  if (!userId) {
    return { ok: false, tier, error: `get_or_create_user falhou: ${userErr?.message ?? "userId null"}` };
  }

  // Tier-guard: só promove se o tier comprado for maior que o atual.
  const { data: current } = await supabase
    .from("users")
    .select("main_tier")
    .eq("id", userId)
    .maybeSingle();
  const currentTier = (current as any)?.main_tier ?? "free";
  const currentRank = TIER_RANK[currentTier] ?? 0;
  const newRank = TIER_RANK[tier] ?? 0;

  if (newRank > currentRank) {
    const { error: upErr } = await supabase
      .from("users")
      .update({ main_tier: tier, origin: "webhook" })
      .eq("id", userId);
    if (upErr) return { ok: false, tier, error: `update main_tier falhou: ${upErr.message}` };
    return { ok: true, tier, action: `upgrade ${currentTier} -> ${tier}` };
  }
  return { ok: true, tier, action: `mantido ${currentTier} (compra ${tier} não é upgrade)` };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Sempre responde 200 pro PerfectPay (mesmo em erro interno), pra evitar
// que o PerfectPay fique reenviando o webhook em loop. Logs ficam no Supabase.
function ok(body: Record<string, unknown> = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendAccessEmail(toEmail: string, productName: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");

  if (!apiKey) return { ok: false, error: "RESEND_API_KEY ausente" };
  if (!from) return { ok: false, error: "RESEND_FROM ausente" };

  // Assunto + corpo HTML responsivo mobile-first com inline CSS
  // (estilos inline são obrigatórios — clientes de email não respeitam <style> nem classes).
  const subject = "¡Todo listo! Tu acceso te está esperando 🎉";
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; background-color:#ffffff; border-radius:12px; padding:32px;">
          <tr>
            <td style="font-family: Arial, Helvetica, sans-serif; color:#1a1a1a; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">¡Hola! Tu compra fue confirmada — ¡bienvenido! 🎉</p>
              <p style="margin:0 0 24px 0;">Para recibir el acceso a tu app, solo toca el botón de abajo. Vas a entrar directo a nuestro canal oficial, donde la activación se hace al tiro.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <a href="https://tinyurl.com/Obtenermiacesso" target="_blank" style="display:inline-block; background-color:#16a34a; color:#ffffff; padding:14px 28px; border-radius:8px; font-weight:bold; text-decoration:none; font-family: Arial, Helvetica, sans-serif; font-size:16px;">Obtener mi acceso</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0; font-size:14px; color:#71717a;">Cualquier duda, solo responde este correo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  const text = `¡Hola! Tu compra fue confirmada — ¡bienvenido! 🎉\n\nPara recibir el acceso a tu app, accede al siguiente enlace:\nhttps://tinyurl.com/Obtenermiacesso\n\nCualquier duda, solo responde este correo.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${errBody}` };
  }
  return { ok: true };
}

// @ts-ignore Deno.serve é nativo no Edge Runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    // 200 mesmo assim — PerfectPay às vezes faz GET pra health-check.
    return ok({ ok: true, message: "method not allowed but acknowledged" });
  }

  let payload: PerfectPayPayload;
  try {
    payload = await req.json();
  } catch (e) {
    console.error("[perfectpay-webhook] JSON inválido:", e);
    return ok({ ok: false, error: "invalid JSON" });
  }

  console.log("[perfectpay-webhook] payload recebido:", JSON.stringify(payload));

  // PerfectPay/CenterPag manda o status em sale_status_enum_key (top-level).
  // Mantemos fallbacks pra sale_status_detail e o formato legado sale.status.
  const status = (
    payload?.sale_status_enum_key ??
    payload?.sale_status_detail ??
    payload?.sale?.status
  )?.toLowerCase();
  if (status !== "approved") {
    console.log(`[perfectpay-webhook] status=${status} ignorado (só processa approved)`);
    return ok({ ok: true, skipped: true, status });
  }

  const email = payload?.customer?.email?.trim().toLowerCase();
  const productName = payload?.product?.name?.trim() || "CL Score";
  const planName = payload?.plan?.name?.trim();
  const phone = payload?.customer?.phone_formated_ddi?.trim();

  if (!email) {
    console.error("[perfectpay-webhook] customer.email ausente no payload");
    return ok({ ok: false, error: "customer.email ausente" });
  }

  // ── 1) LIBERA O PLANO NO BANCO (o que faltava) ───────────────────────────
  let grant: { ok: boolean; tier?: string; action?: string; error?: string };
  try {
    grant = await grantTier(email, planName, productName, phone);
  } catch (e) {
    grant = { ok: false, error: (e as Error)?.message ?? String(e) };
  }
  if (grant.ok) {
    console.log(`[perfectpay-webhook] tier liberado para ${email}: ${grant.action} (plano="${planName ?? ""}")`);
  } else {
    console.error(`[perfectpay-webhook] FALHA ao liberar tier para ${email}: ${grant.error} (plano="${planName ?? ""}")`);
  }

  // ── 2) ENVIA O E-MAIL DE ACESSO ──────────────────────────────────────────
  const result = await sendAccessEmail(email, productName);
  if (!result.ok) {
    console.error(`[perfectpay-webhook] falha ao enviar e-mail para ${email}:`, result.error);
  } else {
    console.log(`[perfectpay-webhook] e-mail enviado com sucesso para ${email} (produto: ${productName})`);
  }

  return ok({
    ok: true,
    sent_to: email,
    product: productName,
    tier: grant.tier ?? null,
    tier_action: grant.ok ? grant.action : `ERRO: ${grant.error}`,
    email_sent: result.ok,
  });
});
