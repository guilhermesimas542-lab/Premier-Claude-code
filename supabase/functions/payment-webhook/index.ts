import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
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

  const rawBody = await req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Log even invalid JSON for debugging
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

  // ── Validate secret (skip for authenticated admins) ─────────────────────
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  let isAuthorizedAdmin = false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const adminCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: isAdmin } = await adminCheck.rpc("is_admin");
    if (isAdmin === true) isAuthorizedAdmin = true;
  }

  if (!isAuthorizedAdmin && webhookSecret) {
    const receivedToken =
      tokenFromQuery ??
      (payload.secret as string) ??
      req.headers.get("x-webhook-secret");
    if (receivedToken !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── Normalize payload ──────────────────────────────────────────────────────
  let eventName: string;
  let buyerEmail: string;
  let buyerName: string | null = null;
  let buyerPhone: string | null = null;
  let paymentId: string;
  let productIds: string[] = [];
  let isTest = false;
  let amount: number | null = null;

  if (payload.EventName || payload.Event) {
    // Lastlink format (Event or EventName)
    eventName = (payload.Event ?? payload.EventName) as string;
    const data = (payload.Data ?? payload.data ?? {}) as Record<string, unknown>;
    const buyer = (data.Buyer ?? data.buyer ?? {}) as Record<string, unknown>;
    buyerEmail = ((buyer.Email ?? buyer.email) as string ?? "").toLowerCase().trim();
    buyerName = (buyer.Name ?? buyer.name) as string ?? null;
    buyerPhone = (buyer.PhoneNumber ?? buyer.phoneNumber ?? buyer.Phone ?? buyer.phone ?? buyer.Cellphone ?? buyer.cellphone) as string ?? null;
    paymentId = (data.PaymentId ?? data.SubscriptionId ?? data.OrderId ?? `ll-${Date.now()}`) as string;
    const products = (data.Products ?? data.products ?? []) as Array<Record<string, unknown>>;
    productIds = products.map((p) => (p.Id ?? p.id) as string).filter(Boolean);
    const payment = (data.Payment ?? data.payment ?? {}) as Record<string, unknown>;
    amount = Number(payment.Amount ?? payment.amount ?? 0) || null;
    isTest = !!(payload._admin_simulation);
  } else {
    // Legacy / generic format
    eventName = (payload.action as string) ?? "purchase";
    buyerEmail = ((payload.email as string) ?? "").toLowerCase().trim();
    paymentId = (payload.order_id ?? payload.payment_id ?? `manual-${Date.now()}`) as string;
    const productKey = payload.product_key as string;
    if (productKey) productIds = [productKey];
    amount = Number(payload.amount ?? 0) || null;
    isTest = !!(payload._admin_simulation);
  }

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
  const { data: logEntry } = await supabase
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

  const logId = logEntry?.id;

  try {
    // ── Is this a purchase approval? ───────────────────────────────────────
    const isPurchaseApproved =
      eventName === "Purchase_Order_Confirmed" ||
      eventName === "Subscription_Renewed" ||
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
    const { data: userData } = await supabase.rpc("get_or_create_user", {
      p_email: buyerEmail,
      p_phone: buyerPhone,
    });

    const userId = userData?.id ?? null;

    // ── Map products via products_catalog ──────────────────────────────────
    let tierToSet: string | null = null;
    const entitlementKeysToGrant: string[] = [];

    if (productIds.length > 0) {
      // Try matching by provider_product_id first
      const { data: catalogItems } = await supabase
        .from("products_catalog")
        .select("provider_product_id, tier, entitlement_key")
        .eq("provider", provider)
        .in("provider_product_id", productIds)
        .eq("active", true);

      if (catalogItems && catalogItems.length > 0) {
        for (const item of catalogItems) {
          if (item.tier) tierToSet = item.tier;
          if (item.entitlement_key) entitlementKeysToGrant.push(item.entitlement_key);
        }
      } else {
        // Fallback: try matching by lastlink_product_uuid (Lastlink sends internal UUIDs)
        const { data: uuidItems } = await supabase
          .from("products_catalog")
          .select("provider_product_id, tier, entitlement_key")
          .eq("provider", provider)
          .in("lastlink_product_uuid", productIds)
          .eq("active", true);

        for (const item of uuidItems ?? []) {
          if (item.tier) tierToSet = item.tier;
          if (item.entitlement_key) entitlementKeysToGrant.push(item.entitlement_key);
        }
      }
    }

    // Fallback: legacy product_key
    if (!tierToSet && entitlementKeysToGrant.length === 0 && payload.product_key) {
      const pk = payload.product_key as string;
      if (["basic", "pro", "ultra"].includes(pk)) {
        tierToSet = pk;
      } else {
        entitlementKeysToGrant.push(pk);
      }
    }

    if (isPurchaseApproved) {
      // ── Update user tier ──────────────────────────────────────────────
      if (tierToSet && userId) {
        await supabase.from("users").update({ main_tier: tierToSet }).eq("id", userId);
      }

      // ── Grant entitlements ────────────────────────────────────────────
      for (const key of entitlementKeysToGrant) {
        if (userId) {
          // Revoke existing first
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
    await supabase
      .from("webhook_logs")
      .update({
        processed_ok: false,
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
