CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (email, main_tier, betting_house_id)
  SELECT 
    NEW.email,
    'free',
    (SELECT id FROM public.betting_houses WHERE is_default = true LIMIT 1)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();