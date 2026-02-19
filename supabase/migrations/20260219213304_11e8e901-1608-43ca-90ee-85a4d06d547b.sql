
-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subscription_object jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins can read all subscriptions (needed to send to everyone)
CREATE POLICY "Admins can read push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (is_admin());

-- Allow insert from service (edge functions)
CREATE POLICY "Allow insert for service"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Allow upsert/update from service
CREATE POLICY "Allow update for service"
ON public.push_subscriptions
FOR UPDATE
USING (true);

-- Allow delete from service
CREATE POLICY "Allow delete for service"
ON public.push_subscriptions
FOR DELETE
USING (true);
