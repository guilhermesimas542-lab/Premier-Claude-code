
ALTER TABLE public.cards ADD COLUMN pay_card_id uuid REFERENCES public.pay_cards(id) ON DELETE SET NULL DEFAULT NULL;
