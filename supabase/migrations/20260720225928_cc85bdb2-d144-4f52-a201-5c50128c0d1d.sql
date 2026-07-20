
CREATE OR REPLACE FUNCTION public.seed_default_menu(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_dest uuid; c_beb uuid; c_lan uuid; c_sob uuid;
  sfx text;
BEGIN
  IF _tenant_id IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.categories WHERE tenant_id = _tenant_id)
     OR EXISTS (SELECT 1 FROM public.products WHERE tenant_id = _tenant_id) THEN
    RETURN;
  END IF;

  sfx := '-' || substr(replace(_tenant_id::text, '-', ''), 1, 8);

  INSERT INTO public.categories (tenant_id, nome, slug, icone, cor, ordem, ativo, descricao)
  VALUES (_tenant_id, 'Destaques', 'destaques'||sfx, 'Star', '#f59e0b', 1, true, 'Itens em destaque')
  RETURNING id INTO c_dest;

  INSERT INTO public.categories (tenant_id, nome, slug, icone, cor, ordem, ativo, descricao)
  VALUES (_tenant_id, 'Bebidas', 'bebidas'||sfx, 'Coffee', '#0ea5e9', 2, true, 'Cafés, sucos e refrigerantes')
  RETURNING id INTO c_beb;

  INSERT INTO public.categories (tenant_id, nome, slug, icone, cor, ordem, ativo, descricao)
  VALUES (_tenant_id, 'Lanches', 'lanches'||sfx, 'Sandwich', '#ef4444', 3, true, 'Lanches e salgados')
  RETURNING id INTO c_lan;

  INSERT INTO public.categories (tenant_id, nome, slug, icone, cor, ordem, ativo, descricao)
  VALUES (_tenant_id, 'Sobremesas', 'sobremesas'||sfx, 'IceCream', '#ec4899', 4, true, 'Doces e sobremesas')
  RETURNING id INTO c_sob;

  INSERT INTO public.products (tenant_id, category_id, nome, slug, descricao, preco, ordem, destaque, unidade, ativo, disponivel)
  VALUES
    (_tenant_id, c_dest, 'Combo do Dia', 'combo-do-dia'||sfx, 'Escolha do chef com ótimo custo-benefício.', 24.90, 1, true, 'un', true, true),
    (_tenant_id, c_dest, 'Especial da Casa', 'especial-da-casa'||sfx, 'Nosso produto mais pedido.', 29.90, 2, true, 'un', true, true),
    (_tenant_id, c_beb, 'Café Expresso', 'cafe-expresso'||sfx, 'Café curto e encorpado.', 5.50, 1, false, 'un', true, true),
    (_tenant_id, c_beb, 'Suco Natural', 'suco-natural'||sfx, 'Suco natural do dia (300ml).', 9.90, 2, false, 'un', true, true),
    (_tenant_id, c_lan, 'Sanduíche Natural', 'sanduiche-natural'||sfx, 'Pão integral com recheio fresco.', 14.90, 1, false, 'un', true, true),
    (_tenant_id, c_lan, 'Pão de Queijo', 'pao-de-queijo'||sfx, 'Tradicional, quentinho.', 4.50, 2, false, 'un', true, true),
    (_tenant_id, c_sob, 'Brownie', 'brownie'||sfx, 'Chocolate intenso com nozes.', 11.90, 1, false, 'un', true, true),
    (_tenant_id, c_sob, 'Torta de Limão', 'torta-de-limao'||sfx, 'Fatia individual, cremosa.', 12.90, 2, false, 'un', true, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.settings (tenant_id, nome_estabelecimento, config)
  SELECT v_tenant, v_nome, '{}'::jsonb
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

  PERFORM public.seed_default_menu(v_tenant);

  RETURN NEW;
END $$;

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT id FROM public.tenants
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.tenant_id = tenants.id)
      AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.tenant_id = tenants.id)
  LOOP
    PERFORM public.seed_default_menu(t.id);
  END LOOP;
END $$;
