
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "profiles master read all" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "authenticated read roles" ON public.user_roles;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "anon read settings" ON public.settings;

CREATE OR REPLACE VIEW public.public_menu_settings AS
SELECT
  tenant_id, nome_estabelecimento, nome_fantasia, descricao,
  logo_url, banner_url, telefone, whatsapp, email,
  endereco, cidade, estado, cep, cor_primaria, cor_secundaria,
  aceita_pedidos_online, taxa_entrega, horario_funcionamento, dias_funcionamento,
  COALESCE(config->'design', '{}'::jsonb) AS design
FROM public.settings;
GRANT SELECT ON public.public_menu_settings TO anon, authenticated;

DROP POLICY IF EXISTS "auth all filiais" ON public.filiais;
CREATE POLICY "filiais master only" ON public.filiais FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "auth all sc" ON public.support_categories;
CREATE POLICY "sc read auth" ON public.support_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "sc write master" ON public.support_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "auth all sp" ON public.support_problems;
CREATE POLICY "sp read auth" ON public.support_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "sp write master" ON public.support_problems FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "auth own tickets" ON public.support_tickets;
CREATE POLICY "tickets self all" ON public.support_tickets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "auth all ratings" ON public.support_ratings;
CREATE POLICY "ratings self all" ON public.support_ratings FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "anon read order" ON public.orders;
DROP POLICY IF EXISTS "anon insert order" ON public.orders;
CREATE POLICY "orders anon public insert" ON public.orders FOR INSERT TO anon
  WITH CHECK (tenant_id IS NOT NULL AND origem IN ('online','mesa'));

DROP POLICY IF EXISTS "anon read order" ON public.order_items;
DROP POLICY IF EXISTS "anon insert order" ON public.order_items;
CREATE POLICY "order_items anon public insert" ON public.order_items FOR INSERT TO anon
  WITH CHECK (
    tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.tenant_id = order_items.tenant_id
        AND o.origem IN ('online','mesa')
    )
  );

DROP POLICY IF EXISTS "anon insert order_payments" ON public.order_payments;
CREATE POLICY "order_payments anon public insert" ON public.order_payments FOR INSERT TO anon
  WITH CHECK (
    tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_payments.order_id
        AND o.tenant_id = order_payments.tenant_id
        AND o.origem IN ('online','mesa')
    )
  );

DROP POLICY IF EXISTS "anon insert customers" ON public.customers;
CREATE POLICY "customers anon public insert" ON public.customers FOR INSERT TO anon
  WITH CHECK (tenant_id IS NOT NULL);

ALTER FUNCTION public.gen_public_codigo() SET search_path = public;
ALTER FUNCTION public.gen_menu_codigo() SET search_path = public;
