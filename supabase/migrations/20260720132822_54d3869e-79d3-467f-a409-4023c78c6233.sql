
-- Grants for licenses (policy exists but no grants were present)
GRANT SELECT ON public.licenses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;

-- Allow tenant owners to read their own license
DROP POLICY IF EXISTS "owner reads own license" ON public.licenses;
CREATE POLICY "owner reads own license" ON public.licenses
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()
  )
);

-- Update handle_new_user to also create a pending license and auto-promote whitelisted emails to master
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_codigo text;
  v_nome text;
  v_is_master boolean;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1));
  v_is_master := lower(COALESCE(NEW.email,'')) IN ('pa123@gmail.com','ph123@gmail.com');

  INSERT INTO public.profiles (id, user_id, nome, email)
  VALUES (NEW.id, NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Reuse tenant if owner already has one
  SELECT id INTO v_tenant FROM public.tenants WHERE owner_user_id = NEW.id LIMIT 1;
  IF v_tenant IS NULL THEN
    v_codigo := public.gen_menu_codigo();
    INSERT INTO public.tenants (codigo, nome, empresa, plano, status, owner_user_id, menu_codigo)
    VALUES ('T-'||upper(substr(md5(random()::text),1,6)), v_nome, v_nome, 'trial', 'ativo', NEW.id, v_codigo)
    RETURNING id INTO v_tenant;
  END IF;

  -- Roles: owner always, plus master for whitelisted emails
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'owner', v_tenant)
  ON CONFLICT DO NOTHING;

  IF v_is_master THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'master', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Settings shell
  INSERT INTO public.settings (tenant_id, config)
  SELECT v_tenant, '{}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE tenant_id = v_tenant);

  -- Pending license (or active if master)
  IF NOT EXISTS (SELECT 1 FROM public.licenses WHERE tenant_id = v_tenant) THEN
    INSERT INTO public.licenses (tenant_id, plano, tipo, situacao)
    VALUES (
      v_tenant,
      'basico',
      'mensal',
      CASE WHEN v_is_master THEN 'ativa' ELSE 'pendente' END
    );
  END IF;

  RETURN NEW;
END $function$;

-- Backfill: tenants without a license
INSERT INTO public.licenses (tenant_id, plano, tipo, situacao)
SELECT t.id, 'basico', 'mensal',
  CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.owner_user_id AND ur.role = 'master')
    THEN 'ativa' ELSE 'pendente' END
FROM public.tenants t
LEFT JOIN public.licenses l ON l.tenant_id = t.id
WHERE l.id IS NULL;
