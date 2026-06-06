CREATE OR REPLACE FUNCTION public.refund_credit(p_user_id uuid, p_source text, p_debit_type text, p_reason text DEFAULT 'unknown')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_debit_type = 'weekly' THEN
    UPDATE public.ai_credit_weekly
    SET weekly_used = GREATEST(weekly_used - 1, 0),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_debit_type = 'extras_bonus' THEN
    UPDATE public.ai_credit_extras
    SET balance_bonus = balance_bonus + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_debit_type = 'extras_purchased' THEN
    UPDATE public.ai_credit_extras
    SET balance_purchased = balance_purchased + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_debit_type = 'unlimited' THEN
    NULL;
  END IF;

  INSERT INTO public.ai_credit_log (
    user_id, event_type, amount, reason, metadata
  ) VALUES (
    p_user_id, 'refund', 1, p_source,
    jsonb_build_object('debit_type', p_debit_type, 'reason', p_reason)
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;