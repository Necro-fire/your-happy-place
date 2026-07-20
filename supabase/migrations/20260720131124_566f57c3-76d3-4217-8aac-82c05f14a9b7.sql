
-- ============================================================
-- 1. Tenants: menu_codigo + owner_user_id (owner_user_id já existe)
-- ============================================================
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS menu_codigo text;

CREATE OR REPLACE FUNCTION public.gen_menu_codigo()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
BEGIN
  LOOP
    c := '';
    FOR i IN 1..6 LOOP
      c := c || substr(alfabeto, 1 + floor(random()*length(alfabeto))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE menu_codigo = c) THEN
      RETURN c;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. Adiciona tenant_id nas tabelas de operação (nullable)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','categories','combos','combo_items','complements','complement_groups',
    'product_complement_groups','orders','order_items','order_payments',
    'cash_sessions','cash_movements','stock_movements','financeiro_movimentos',
    'restaurant_tables','table_history','producao_orders','service_orders',
    'suppliers','clients','customers','employees','settings','company_settings',
    'role_permissions','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
  END LOOP;
END $$;

-- user_roles ganha tenant_id
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- ============================================================
-- 3. Cria tenant "Empresa Principal" para o dono existente e backfill
-- ============================================================
DO $$
DECLARE
  v_owner uuid := 'b6301670-d9c7-4b6d-9b2d-2aa49888c14e';
  v_tenant uuid;
  v_codigo text;
  t text;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants WHERE owner_user_id = v_owner LIMIT 1;
  IF v_tenant IS NULL THEN
    v_codigo := public.gen_menu_codigo();
    INSERT INTO public.tenants (codigo, nome, empresa, plano, status, owner_user_id, menu_codigo)
    VALUES ('T-'||upper(substr(md5(random()::text),1,6)), 'Empresa Principal', 'Empresa Principal', 'pro', 'ativo', v_owner, v_codigo)
    RETURNING id INTO v_tenant;
  ELSE
    UPDATE public.tenants SET menu_codigo = COALESCE(menu_codigo, public.gen_menu_codigo()) WHERE id = v_tenant;
  END IF;

  -- backfill
  FOREACH t IN ARRAY ARRAY[
    'products','categories','combos','combo_items','complements','complement_groups',
    'product_complement_groups','orders','order_items','order_payments',
    'cash_sessions','cash_movements','stock_movements','financeiro_movimentos',
    'restaurant_tables','table_history','producao_orders','service_orders',
    'suppliers','clients','customers','employees','settings','company_settings',
    'role_permissions','audit_logs'
  ] LOOP
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_tenant);
  END LOOP;

  UPDATE public.user_roles SET tenant_id = v_tenant WHERE tenant_id IS NULL AND user_id = v_owner;
END $$;

-- ============================================================
-- 4. NOT NULL + FK + índices
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','categories','combos','combo_items','complements','complement_groups',
    'product_complement_groups','orders','order_items','order_payments',
    'cash_sessions','cash_movements','stock_movements','financeiro_movimentos',
    'restaurant_tables','table_history','producao_orders','service_orders',
    'suppliers','clients','customers','employees','settings','company_settings',
    'role_permissions','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t||'_tenant_fk');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE', t, t||'_tenant_fk');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', 'idx_'||t||'_tenant', t);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_menu_codigo_uidx ON public.tenants(menu_codigo);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_owner_uidx ON public.tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS user_roles_tenant_idx ON public.user_roles(tenant_id);

-- ============================================================
-- 5. Função current_tenant_id() (retorna tenant do user logado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id IS NOT NULL LIMIT 1
$$;

-- ============================================================
-- 6. Drop policies antigas e recria policies escopadas por tenant
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN (
      'products','categories','combos','combo_items','complements','complement_groups',
      'product_complement_groups','orders','order_items','order_payments',
      'cash_sessions','cash_movements','stock_movements','financeiro_movimentos',
      'restaurant_tables','table_history','producao_orders','service_orders',
      'suppliers','clients','customers','employees','settings','company_settings',
      'role_permissions','audit_logs'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Policies genéricas por tenant + Master
DO $$
DECLARE
  t text;
  public_tables text[] := ARRAY['products','categories','combos','combo_items','complements','complement_groups','product_complement_groups'];
  order_public_tables text[] := ARRAY['orders','order_items'];
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','categories','combos','combo_items','complements','complement_groups',
    'product_complement_groups','orders','order_items','order_payments',
    'cash_sessions','cash_movements','stock_movements','financeiro_movimentos',
    'restaurant_tables','table_history','producao_orders','service_orders',
    'suppliers','clients','customers','employees','settings','company_settings',
    'role_permissions','audit_logs'
  ] LOOP
    -- Autenticado: só o próprio tenant
    EXECUTE format($f$
      CREATE POLICY "tenant scope all" ON public.%I
      FOR ALL TO authenticated
      USING (tenant_id = public.current_tenant_id() OR public.has_role(auth.uid(),'master'))
      WITH CHECK (tenant_id = public.current_tenant_id() OR public.has_role(auth.uid(),'master'))
    $f$, t);
  END LOOP;

  -- Leitura pública (anon) para tabelas do cardápio — filtro por tenant é feito no app via menu_codigo
  FOREACH t IN ARRAY public_tables LOOP
    EXECUTE format($f$
      CREATE POLICY "anon read menu" ON public.%I FOR SELECT TO anon USING (true)
    $f$, t);
  END LOOP;

  -- Inserção anônima em pedidos (cardápio público) + leitura
  FOREACH t IN ARRAY order_public_tables LOOP
    EXECUTE format($f$
      CREATE POLICY "anon insert order" ON public.%I FOR INSERT TO anon WITH CHECK (true)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "anon read order" ON public.%I FOR SELECT TO anon USING (true)
    $f$, t);
  END LOOP;

  EXECUTE $f$ CREATE POLICY "anon insert order_payments" ON public.order_payments FOR INSERT TO anon WITH CHECK (true) $f$;
  EXECUTE $f$ CREATE POLICY "anon insert customers" ON public.customers FOR INSERT TO anon WITH CHECK (true) $f$;
END $$;

-- Tenants: user só vê o próprio; master vê todos
DROP POLICY IF EXISTS "master gerencia tenants" ON public.tenants;
DROP POLICY IF EXISTS "owner reads own tenant" ON public.tenants;
DROP POLICY IF EXISTS "owner updates own tenant" ON public.tenants;
CREATE POLICY "master gerencia tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'master'))
  WITH CHECK (public.has_role(auth.uid(),'master'));
CREATE POLICY "owner reads own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());
CREATE POLICY "owner updates own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "anon read tenant by codigo" ON public.tenants
  FOR SELECT TO anon USING (menu_codigo IS NOT NULL);

-- ============================================================
-- 7. handle_new_user cria tenant + role owner para novo signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_codigo text;
  v_nome text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, user_id, nome, email)
  VALUES (NEW.id, NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Se já existe tenant desse dono, reaproveita
  SELECT id INTO v_tenant FROM public.tenants WHERE owner_user_id = NEW.id LIMIT 1;
  IF v_tenant IS NULL THEN
    v_codigo := public.gen_menu_codigo();
    INSERT INTO public.tenants (codigo, nome, empresa, plano, status, owner_user_id, menu_codigo)
    VALUES ('T-'||upper(substr(md5(random()::text),1,6)), v_nome, v_nome, 'trial', 'ativo', NEW.id, v_codigo)
    RETURNING id INTO v_tenant;
  END IF;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'owner', v_tenant)
  ON CONFLICT DO NOTHING;

  -- Settings shell
  INSERT INTO public.settings (tenant_id, config)
  SELECT v_tenant, '{}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE tenant_id = v_tenant);

  RETURN NEW;
END $$;

-- Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- GRANTs (garante Data API)
GRANT SELECT ON public.tenants TO anon, authenticated;
GRANT ALL ON public.tenants TO service_role;
