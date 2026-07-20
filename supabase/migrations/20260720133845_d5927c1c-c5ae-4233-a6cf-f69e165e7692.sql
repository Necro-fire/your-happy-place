ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_id_check;
CREATE UNIQUE INDEX IF NOT EXISTS settings_tenant_unique ON public.settings(tenant_id);