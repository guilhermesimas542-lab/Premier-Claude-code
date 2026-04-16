
WITH purchase_tiers AS (
  SELECT
    lower(wl.buyer_email) AS email,
    pc.tier AS purchased_tier,
    CASE pc.tier
      WHEN 'basic' THEN 1
      WHEN 'pro' THEN 2
      WHEN 'ultra' THEN 3
      ELSE 0
    END AS tier_rank
  FROM webhook_logs wl
  JOIN products_catalog pc 
    ON pc.provider_product_id = (wl.raw_payload->'product'->>'code')
    OR pc.provider_product_id = (wl.raw_payload->'product'->'items'->0->>'code')
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(wl.raw_payload->'Data'->'Products','[]'::jsonb)) elem
      WHERE pc.provider_product_id = (elem->>'Id')
    )
  WHERE wl.processed_ok = true
    AND wl.event_name IN ('Purchase_Order_Confirmed','Subscription_Product_Access','Subscription_Renewed','purchase','approved')
    AND pc.tier IS NOT NULL
    AND pc.active = true
),
max_tier_per_user AS (
  SELECT
    email,
    (ARRAY_AGG(purchased_tier ORDER BY tier_rank DESC))[1] AS best_tier,
    MAX(tier_rank) AS best_rank
  FROM purchase_tiers
  GROUP BY email
)
UPDATE users u
SET main_tier = mtu.best_tier::main_tier
FROM max_tier_per_user mtu
WHERE lower(u.email) = mtu.email
  AND (CASE u.main_tier
    WHEN 'basic' THEN 1
    WHEN 'pro' THEN 2
    WHEN 'ultra' THEN 3
    ELSE 0
  END) < mtu.best_rank;
