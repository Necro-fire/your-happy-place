
-- Slug system for tenant public URLs
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(txt, ''))),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

CREATE OR REPLACE FUNCTION public.gen_tenant_slug(base text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  s text;
  candidate text;
  i int := 1;
BEGIN
  s := public.slugify(base);
  IF s IS NULL OR length(s) < 2 THEN
    s := 'loja-' || lower(substr(md5(random()::text), 1, 6));
  END IF;
  candidate := s;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate) LOOP
    i := i + 1;
    candidate := s || '-' || i;
  END LOOP;
  RETURN candidate;
END $$;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text;

-- Backfill any missing slugs
UPDATE public.tenants
SET slug = public.gen_tenant_slug(COALESCE(NULLIF(nome, ''), NULLIF(empresa, ''), 'loja'))
WHERE slug IS NULL;

ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key ON public.tenants (slug);

-- Allow anon to read tenants by slug too (previous policy already allows read by codigo)
DROP POLICY IF EXISTS "anon read tenant by codigo" ON public.tenants;
CREATE POLICY "anon read tenant public" ON public.tenants
  FOR SELECT TO anon
  USING (slug IS NOT NULL OR menu_codigo IS NOT NULL);

-- Update handle_new_user to also set slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_codigo text;
  v_slug text;
  v_nome text;
  v_is_master boolean;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1));
  v_is_master := lower(COALESCE(NEW.email,'')) IN ('pa123@gmail.com','ph123@gmail.com');

  INSERT INTO public.profiles (id, user_id, nome, email)
  VALUES (NEW.id, NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_tenant FROM public.tenants WHERE owner_user_id = NEW.id LIMIT 1;
  IF v_tenant IS NULL THEN
    v_codigo := public.gen_menu_codigo();
    v_slug := public.gen_tenant_slug(v_nome);
    INSERT INTO public.tenants (codigo, nome, empresa, plano, status, owner_user_id, menu_codigo, slug)
    VALUES ('T-'||upper(substr(md5(random()::text),1,6)), v_nome, v_nome, 'trial', 'ativo', NEW.id, v_codigo, v_slug)
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
