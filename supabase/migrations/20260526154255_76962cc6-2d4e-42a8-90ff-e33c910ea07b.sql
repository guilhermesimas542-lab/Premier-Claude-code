ALTER TABLE public.ai_credit_log
  DROP CONSTRAINT IF EXISTS ai_credit_log_event_type_check;

ALTER TABLE public.ai_credit_log
  ADD CONSTRAINT ai_credit_log_event_type_check CHECK (
    event_type IN (
      'debit',
      'unlimited_use',
      'denied',
      'cache_hit_free',
      'grant_bonus',
      'grant_purchased',
      'grant_unlimited',
      'refund',
      'refund_recorded_no_removal'
    )
  );