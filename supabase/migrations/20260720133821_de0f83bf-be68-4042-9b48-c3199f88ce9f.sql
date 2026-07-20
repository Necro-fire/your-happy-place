CREATE SEQUENCE IF NOT EXISTS public.settings_id_seq OWNED BY public.settings.id;
SELECT setval('public.settings_id_seq', COALESCE((SELECT MAX(id) FROM public.settings), 0) + 1, false);
ALTER TABLE public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq');