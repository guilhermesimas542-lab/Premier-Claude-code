CREATE OR REPLACE FUNCTION public.get_daily_ai_cost_usd()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN source_data->>'claude_model_used' LIKE 'claude-opus%' THEN
        (tokens_input::numeric * 15 + tokens_output::numeric * 75) / 1000000.0
      ELSE
        (tokens_input::numeric * 3 + tokens_output::numeric * 15) / 1000000.0
    END
  ), 0)::numeric
  FROM public.ai_tip_cache
  WHERE generated_at >= (date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
    AND source_data->>'claude_model_used' IS NOT NULL
    AND (tokens_input > 0 OR tokens_output > 0);
$$;

REVOKE EXECUTE ON FUNCTION public.get_daily_ai_cost_usd() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_ai_cost_usd() TO service_role;