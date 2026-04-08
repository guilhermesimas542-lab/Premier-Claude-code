
DELETE FROM public.user_achievements a
USING public.user_achievements b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.achievement_id = b.achievement_id
  AND COALESCE(a.achievement_date::text, '') = COALESCE(b.achievement_date::text, '');

ALTER TABLE public.user_achievements
ADD CONSTRAINT user_achievements_unique_per_day 
UNIQUE (user_id, achievement_id, achievement_date);
