
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_codigo text UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_public_codigo()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text; i int;
BEGIN
  LOOP
    c := '';
    FOR i IN 1..8 LOOP
      c := c || substr(alfabeto, 1 + floor(random()*length(alfabeto))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE public_codigo = c) THEN
      RETURN c;
    END IF;
  END LOOP;
END $$;

-- Backfill existing tenants
UPDATE public.tenants SET public_codigo = public.gen_public_codigo() WHERE public_codigo IS NULL;

-- Update handle_new_user to include public_codigo
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_codigo text;
  v_pub text;
  v_slug text;
  v_nome text;
  v_is_master boolean;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1));
  v_is_master := lower(COALESCE(NEW.email,'')) IN ('ph123@gmail.com');

  INSERT INTO public.profiles (id, user_id, nome, email)
  VALUES (NEW.id, NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_tenant FROM public.tenants WHERE owner_user_id = NEW.id LIMIT 1;
  IF v_tenant IS NULL THEN
    v_codigo := public.gen_menu_codigo();
    v_pub := public.gen_public_codigo();
    v_slug := public.gen_tenant_slug(v_nome);
    INSERT INTO public.tenants (codigo, nome, empresa, plano, status, owner_user_id, menu_codigo, slug, public_codigo)
    VALUES ('T-'||upper(substr(md5(random()::text),1,6)), v_nome, v_nome, 'trial', 'ativo', NEW.id, v_codigo, v_slug, v_pub)
    RETURNING id INTO v_tenant;
  END IF;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'proprietario', v_tenant)
  ON CONFLICT DO NOTHING;

  IF v_is_master THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'master', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.settings (tenant_id, config)
  SELECT v_tenant, '{}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE tenant_id = v_tenant);

  IF NOT EXISTS (SELECT 1 FROM public.licenses WHERE tenant_id = v_tenant) THEN
    INSERT INTO public.licenses (tenant_id, plano, tipo, situacao)
    VALUES (v_tenant, 'basico', 'mensal', CASE WHEN v_is_master THEN 'ativa' ELSE 'pendente' END);
  END IF;

  RETURN NEW;
END $function$;

-- Update anon read policy to include public_codigo
DROP POLICY IF EXISTS "anon read tenant public" ON public.tenants;
CREATE POLICY "anon read tenant public" ON public.tenants FOR SELECT TO anon
  USING (slug IS NOT NULL OR menu_codigo IS NOT NULL OR public_codigo IS NOT NULL);
