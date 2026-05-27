// supabase/functions/perfectpay-webhook/index.ts
//
// Webhook isolado do PerfectPay → dispara e-mail de acesso via Resend.
//
// Fluxo:
//   1. Recebe POST do PerfectPay
//   2. Valida que sale.status === "approved"
//   3. Extrai customer.email + product.name
//   4. Envia e-mail via Resend (fetch nativo, sem SDK)
//   5. Retorna 200 OK pro PerfectPay confirmar recebimento
//
// Env vars necessárias (configurar no Supabase):
//   - RESEND_API_KEY   (chave da API do Resend)
//   - RESEND_FROM      (ex: "acesso@clscore.app")
//
// Esta função é COMPLETAMENTE ISOLADA — não importa nada do projeto principal.

// deno-lint-ignore-file no-explicit-any
// @ts-ignore Deno é resolvido no runtime do Supabase Edge Functions
declare const Deno: { env: { get(k: string): string | undefined } };

interface PerfectPayPayload {
  customer?: { email?: string; name?: string };
  product?: { name?: string };
  sale?: { status?: string; id?: string | number; code?: string };
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

  const status = payload?.sale?.status?.toLowerCase();
  if (status !== "approved") {
    console.log(`[perfectpay-webhook] status=${status} ignorado (só processa approved)`);
    return ok({ ok: true, skipped: true, status });
  }

  const email = payload?.customer?.email?.trim().toLowerCase();
  const productName = payload?.product?.name?.trim() || "CL Score";

  if (!email) {
    console.error("[perfectpay-webhook] customer.email ausente no payload");
    return ok({ ok: false, error: "customer.email ausente" });
  }

  const result = await sendAccessEmail(email, productName);
  if (!result.ok) {
    console.error(`[perfectpay-webhook] falha ao enviar e-mail para ${email}:`, result.error);
    return ok({ ok: false, error: result.error });
  }

  console.log(`[perfectpay-webhook] e-mail enviado com sucesso para ${email} (produto: ${productName})`);
  return ok({ ok: true, sent_to: email, product: productName });
});
