ALTER TABLE public.banner_analytics DROP CONSTRAINT banner_analytics_user_id_fkey;

ALTER TABLE public.banner_analytics ADD CONSTRAINT banner_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;