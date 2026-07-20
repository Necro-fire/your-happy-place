
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
    INSERT INTO public.tenants (codigo, nome, empresa, plano, status, owner_user_id, menu_codigo, slug, public_codigo, vence_em, ativado_em)
    VALUES (
      'T-'||upper(substr(md5(random()::text),1,6)),
      v_nome, v_nome, 'trial', 'teste', NEW.id,
      v_codigo, v_slug, v_pub,
      now() + interval '7 days',
      now()
    )
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
    INSERT INTO public.licenses (tenant_id, plano, tipo, situacao, emitida_em, vence_em, valor)
    VALUES (
      v_tenant,
      CASE WHEN v_is_master THEN 'enterprise' ELSE 'trial' END,
      CASE WHEN v_is_master THEN 'vitalicia' ELSE 'trial' END,
      'ativa',
      now(),
      CASE WHEN v_is_master THEN NULL ELSE now() + interval '7 days' END,
      0
    );
  END IF;

  RETURN NEW;
END $function$;

UPDATE public.licenses AS l
SET situacao = 'ativa',
    tipo    = 'trial',
    plano   = COALESCE(NULLIF(l.plano, ''), 'trial'),
    emitida_em = COALESCE(l.emitida_em, now()),
    vence_em   = COALESCE(t.created_at, now()) + interval '7 days'
FROM public.tenants t
WHERE l.tenant_id = t.id
  AND l.situacao = 'pendente'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = t.owner_user_id AND ur.role = 'master'
  );

UPDATE public.licenses
SET situacao = 'expirada'
WHERE situacao = 'ativa'
  AND vence_em IS NOT NULL
  AND vence_em < now();

CREATE OR REPLACE FUNCTION public.server_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$ SELECT now() $$;

GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated;
