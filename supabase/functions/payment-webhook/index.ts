import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-lastlink-signature",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let logId: string | null = null;

  try {
    const rawBody = await req.text();
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      await supabase.from("raw_webhook_logs").insert({ payload: { _raw_text: rawBody, _error: "Invalid JSON" } });
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Raw log (before any validation) ──────────────────────────────────────
    await supabase.from("raw_webhook_logs").insert({ payload });

    // ── Ignore test webhooks from Lastlink ─────────────────────────────────
    if (payload.IsTest === true) {
      return new Response(
        JSON.stringify({ status: "ok", message: "Test webhook ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Detect provider ────────────────────────────────────────────────────────
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") ?? "lastlink";
    const tokenFromQuery = url.searchParams.get("token");

    // ── Validação de Segurança ─────────────────────────────────────────────
    const lastlinkSecret = Deno.env.get("LASTLINK_WEBHOOK_SECRET");
    const signature = req.headers.get("x-lastlink-signature");
    let isAuthorized = false;

    // 1. Prioridade Máxima: Validação HMAC da Lastlink
    if (signature && lastlinkSecret) {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(lastlinkSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"]
        );
        const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        const dataBuffer = new TextEncoder().encode(rawBody);
        isAuthorized = await crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer);
        console.log("[webhook] HMAC verification result:", isAuthorized);
      } catch (e) {
        console.error("[webhook] Erro na verificação HMAC:", e);
        isAuthorized = false;
      }
    }

    // 2. Fallback: Verificação de token de admin (para re-processamento e testes)
    if (!isAuthorized) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const adminCheck = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: isAdmin } = await adminCheck.rpc("is_admin");
        if (isAdmin === true) isAuthorized = true;
      }
    }

    // 3. Fallback: Verificação de secret simples (para outros providers)
    const simpleWebhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (!isAuthorized && simpleWebhookSecret) {
      const receivedToken =
        tokenFromQuery ??
        (payload.secret as string) ??
        req.headers.get("x-webhook-secret");
      if (receivedToken === simpleWebhookSecret) {
        isAuthorized = true;
      }
    }

    // Se nenhum método de autorização passou, retorna 401
    if (!isAuthorized) {
      console.warn("[webhook] Unauthorized. hmac_header:", !!signature, "hmac_secret_set:", !!lastlinkSecret, "simple_secret_set:", !!simpleWebhookSecret, "token_query:", !!tokenFromQuery, "x-webhook-secret_header:", !!req.headers.get("x-webhook-secret"));
      return new Response(JSON.stringify({ error: "Unauthorized: No valid authentication method found." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Normalize payload ──────────────────────────────────────────────────────
    let eventName: string;
    let buyerEmail: string;
    let buyerName: string | null = null;
    let buyerPhone: string | null = null;
    let paymentId: string;
    let productIds: string[] = [];
    let productNames: string[] = [];
    let subscriptionId: string | null = null;
    let isTest = false;
    let amount: number | null = null;

    if (payload.EventName || payload.Event) {
      eventName = (payload.Event ?? payload.EventName) as string;
      const data = (payload.Data ?? payload.data ?? {}) as Record<string, unknown>;
      const buyer = (data.Buyer ?? data.buyer ?? {}) as Record<string, unknown>;
      buyerEmail = ((buyer.Email ?? buyer.email) as string ?? "").toLowerCase().trim();
      buyerName = (buyer.Name ?? buyer.name) as string ?? null;
      buyerPhone = (buyer.PhoneNumber ?? buyer.phoneNumber ?? buyer.Phone ?? buyer.phone ?? buyer.Cellphone ?? buyer.cellphone) as string ?? null;

      const products = (data.Products ?? data.products ?? []) as Array<Record<string, unknown>>;
      productIds = products.map((p) => (p.Id ?? p.id) as string).filter(Boolean);
      productNames = products.map((p) => (p.Name ?? p.name ?? '') as string).filter(Boolean);

      const purchase = (data.Purchase ?? data.purchase ?? {}) as Record<string, unknown>;
      const purchasePayment = (purchase.Payment ?? purchase.payment ?? {}) as Record<string, unknown>;
      paymentId = (purchase.PaymentId ?? purchasePayment.PaymentId ?? data.PaymentId ?? data.SubscriptionId ?? data.OrderId ?? `ll-${Date.now()}`) as string;

      const subscriptions = (data.Subscriptions ?? data.subscriptions ?? []) as Array<Record<string, unknown>>;
      subscriptionId = subscriptions.length > 0
        ? ((subscriptions[0].Id ?? subscriptions[0].id) as string ?? null)
        : ((data.SubscriptionId ?? data.subscription_id ?? null) as string | null);

      const purchasePrice = (purchase.Price ?? purchase.price ?? {}) as Record<string, unknown>;
      amount = Number(purchasePrice.Value ?? purchasePrice.value ?? purchasePayment.Amount ?? purchasePayment.amount ?? 0) || null;

      isTest = !!(payload._admin_simulation);

      console.log("[webhook] Lastlink parsed:", { eventName, buyerEmail, paymentId, productIds, productNames, subscriptionId, amount });
    } else {
      eventName = (payload.action as string) ?? "purchase";
      buyerEmail = ((payload.email as string) ?? "").toLowerCase().trim();
      paymentId = (payload.order_id ?? payload.payment_id ?? `manual-${Date.now()}`) as string;
      const productKey = payload.product_key as string;
      if (productKey) productIds = [productKey];
      amount = Number(payload.amount ?? 0) || null;
      isTest = !!(payload._admin_simulation);
    }

    // ── Financial event logging ────────────────────────────────────────────────
    const isRecurringEvent = eventName === 'Subscription_Renewed' || eventName === 'Pagamento_de_Renovacao_Efetuado';
    const valueCents = Math.round((amount ?? 0) * 100);
    await supabase.from('financial_events').insert({
      event_name: eventName,
      email: buyerEmail || null,
      product_name: productNames.join(', ') || null,
      product_id: productIds.join(', ') || null,
      value_cents: valueCents,
      order_id: paymentId,
      subscription_id: subscriptionId,
      is_recurring: isRecurringEvent,
      is_test: isTest,
      raw_payload: payload,
    });

    if (!buyerEmail) {
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotency ────────────────────────────────────────────────────────────
    const uniqueKey = `${eventName}|${paymentId}|${buyerEmail}`;
    const { data: existingLog } = await supabase
      .from("webhook_logs")
      .select("id")
      .eq("unique_key", uniqueKey)
      .eq("processed_ok", true)
      .maybeSingle();

    if (existingLog) {
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Log entry ──────────────────────────────────────────────────────────────
    const { data: logEntry, error: logInsertError } = await supabase
      .from("webhook_logs")
      .insert({
        provider,
        event_name: eventName,
        buyer_email: buyerEmail,
        unique_key: uniqueKey,
        processed_ok: false,
        raw_payload: payload,
        is_test: isTest,
        provider_event_id: paymentId,
      })
      .select("id")
      .single();

    if (logInsertError) throw logInsertError;
    logId = logEntry.id;

    // ── Is this a purchase approval? ───────────────────────────────────────
    const isPurchaseApproved =
      eventName === "Purchase_Order_Confirmed" ||
      eventName === "Subscription_Renewed" ||
      eventName === "Pagamento_de_Renovacao_Efetuado" ||
      eventName === "Subscription_Reactivated" ||
      eventName === "purchase" ||
      eventName === "approved";

    const isRefundOrCancel =
      eventName === "Purchase_Refunded" ||
      eventName === "Subscription_Cancelled" ||
      eventName === "Chargeback" ||
      eventName === "refund" ||
      eventName === "cancel";

    if (!isPurchaseApproved && !isRefundOrCancel) {
      await supabase
        .from("webhook_logs")
        .update({ processed_ok: true })
        .eq("id", logId);

      return new Response(
        JSON.stringify({ status: "event_logged", event: eventName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Find or create user ────────────────────────────────────────────────
    const { data: userData, error: userError } = await supabase.rpc("get_or_create_user", {
      p_email: buyerEmail,
      p_phone: buyerPhone,
    });

    console.log("[webhook] get_or_create_user:", { userData, userError });

    const userId = userData?.id ?? null;

    if (!userId) {
      const errMsg = `Falha ao criar/encontrar usuário: ${userError?.message ?? "userId retornou null"}`;
      console.error("[webhook]", errMsg);
      await supabase
        .from("webhook_logs")
        .update({ processed_ok: false, error_message: errMsg })
        .eq("id", logId);

      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Map products via products_catalog ──────────────────────────────────
    let tierToSet: string | null = null;
    const entitlementKeysToGrant: string[] = [];

    if (productIds.length > 0) {
      const { data: catalogItems, error: catalogError } = await supabase
        .from("products_catalog")
        .select("provider_product_id, tier, entitlement_key")
        .eq("provider", provider)
        .in("provider_product_id", productIds)
        .eq("active", true);

      console.log("[webhook] catalog lookup by provider_product_id:", { productIds, provider, catalogItems, catalogError });

      if (catalogItems && catalogItems.length > 0) {
        for (const item of catalogItems) {
          if (item.tier) tierToSet = item.tier;
          if (item.entitlement_key) entitlementKeysToGrant.push(item.entitlement_key);
        }
      } else {
        const { data: uuidItems, error: uuidError } = await supabase
          .from("products_catalog")
          .select("provider_product_id, tier, entitlement_key")
          .eq("provider", provider)
          .in("lastlink_product_uuid", productIds)
          .eq("active", true);

        console.log("[webhook] catalog fallback by lastlink_product_uuid:", { uuidItems, uuidError });

        if (uuidItems && uuidItems.length > 0) {
          for (const item of uuidItems) {
            if (item.tier) tierToSet = item.tier;
            if (item.entitlement_key) entitlementKeysToGrant.push(item.entitlement_key);
          }
        }
      }
    }

    console.log("[webhook] resolved:", { tierToSet, entitlementKeysToGrant, userId });

    // Fallback: legacy product_key
    if (!tierToSet && entitlementKeysToGrant.length === 0 && payload.product_key) {
      const pk = payload.product_key as string;
      if (["basic", "pro", "ultra"].includes(pk)) {
        tierToSet = pk;
      } else {
        entitlementKeysToGrant.push(pk);
      }
    }

    // ── Fail explicitly if no product matched ─────────────────────────────
    if (!tierToSet && entitlementKeysToGrant.length === 0 && productIds.length > 0) {
      const errMsg = `Produto não encontrado no catálogo para IDs: ${productIds.join(", ")} (provider: ${provider})`;
      console.error("[webhook]", errMsg);
      await supabase
        .from("webhook_logs")
        .update({ processed_ok: false, error_message: errMsg })
        .eq("id", logId);

      return new Response(
        JSON.stringify({ status: "error", message: errMsg }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isPurchaseApproved) {
      if (tierToSet && userId) {
        await supabase.from("users").update({ main_tier: tierToSet, origin: "webhook" }).eq("id", userId);
      } else if (userId) {
        await supabase.from("users").update({ origin: "webhook" }).eq("id", userId);
      }

      for (const key of entitlementKeysToGrant) {
        if (userId) {
          await supabase
            .from("entitlements")
            .update({ status: "revoked" })
            .eq("user_id", userId)
            .eq("product_key", key)
            .eq("status", "active");

          await supabase.from("entitlements").insert({
            user_id: userId,
            product_key: key,
            source: "purchase",
            status: "active",
            starts_at: new Date().toISOString(),
            ends_at: null,
          });
        }
      }
    } else if (isRefundOrCancel) {
      if (tierToSet && userId) {
        await supabase.from("users").update({ main_tier: "free" }).eq("id", userId);
      }
      for (const key of entitlementKeysToGrant) {
        if (userId) {
          await supabase
            .from("entitlements")
            .update({ status: "revoked" })
            .eq("user_id", userId)
            .eq("product_key", key)
            .eq("status", "active");
        }
      }
    }

    // ── Record in orders ───────────────────────────────────────────────────
    await supabase.from("orders").insert({
      provider,
      provider_order_id: paymentId,
      provider_event_id: paymentId,
      event_name: eventName,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      user_id: userId,
      status: isRefundOrCancel ? "refunded" : "paid",
      paid_at: new Date().toISOString(),
      amount: amount ?? 0,
      product_ids: productIds,
      unique_key: uniqueKey,
      is_test: isTest,
      raw_payload: payload,
    });

    // ── Log event ──────────────────────────────────────────────────────────
    if (userId) {
      await supabase.from("events").insert({
        user_id: userId,
        event_name: `payment_${isPurchaseApproved ? "purchase" : "refund"}`,
        metadata: {
          provider,
          product_ids: productIds,
          tier: tierToSet,
          entitlements: entitlementKeysToGrant,
          email: buyerEmail,
        },
      });
    }

    // ── Mark log as processed ──────────────────────────────────────────────
    await supabase
      .from("webhook_logs")
      .update({ processed_ok: true })
      .eq("id", logId);

    return new Response(
      JSON.stringify({
        status: "ok",
        tier: tierToSet,
        entitlements: entitlementKeysToGrant,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[webhook] ERRO GLOBAL:", err);

    if (logId) {
      await supabase
        .from("webhook_logs")
        .update({
          processed_ok: false,
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: "Internal Server Error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
