
-- Upgrade all existing tenants (non-master) to Plus, ativa, no expiration
UPDATE public.licenses
SET plano = 'plus', tipo = 'vitalicia', situacao = 'ativa', vence_em = NULL, updated_at = now()
WHERE plano <> 'enterprise';

UPDATE public.tenants
SET plano = 'plus', status = 'ativo', vence_em = NULL, updated_at = now()
WHERE plano <> 'enterprise';

-- New signups start as Plus assinantes (no trial)
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
      v_nome, v_nome,
      CASE WHEN v_is_master THEN 'enterprise' ELSE 'plus' END,
      'ativo', NEW.id,
      v_codigo, v_slug, v_pub,
      NULL,
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

  INSERT INTO public.settings (tenant_id, nome_estabelecimento, config)
  SELECT v_tenant, v_nome, '{}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE tenant_id = v_tenant);

  IF NOT EXISTS (SELECT 1 FROM public.licenses WHERE tenant_id = v_tenant) THEN
    INSERT INTO public.licenses (tenant_id, plano, tipo, situacao, emitida_em, vence_em, valor)
    VALUES (
      v_tenant,
      CASE WHEN v_is_master THEN 'enterprise' ELSE 'plus' END,
      CASE WHEN v_is_master THEN 'vitalicia' ELSE 'vitalicia' END,
      'ativa',
      now(),
      NULL,
      0
    );
  END IF;

  PERFORM public.seed_default_menu(v_tenant);

  RETURN NEW;
END $function$;
