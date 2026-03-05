ALTER TABLE public.pay_cards ADD COLUMN IF NOT EXISTS button_color text DEFAULT NULL;
ALTER TABLE public.pay_cards ADD COLUMN IF NOT EXISTS checkout_template text DEFAULT 'default';
ALTER TABLE public.pay_cards ADD COLUMN IF NOT EXISTS checkout_final_config jsonb DEFAULT '{}'::jsonb;