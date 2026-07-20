
-- =====================================================
-- BAKERY / RESTAURANT MANAGEMENT — FULL SCHEMA
-- =====================================================

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('proprietario','admin','gerente','operador','garcom','caixa','cozinha','entregador');
CREATE TYPE public.order_status AS ENUM ('novo','confirmado','em_preparo','pronto','saiu_entrega','entregue','finalizado','cancelado');
CREATE TYPE public.order_tipo AS ENUM ('retirada','entrega','local');
CREATE TYPE public.order_origem AS ENUM ('online','mesa','pdv');
CREATE TYPE public.pay_method AS ENUM ('pix','dinheiro','credito','debito','vale','credito_cliente','multiplo');
CREATE TYPE public.table_status AS ENUM ('livre','ocupada','reservada','fechando');
CREATE TYPE public.cash_status AS ENUM ('aberta','fechada');
CREATE TYPE public.cash_mov_tipo AS ENUM ('venda','entrada','sangria','suprimento','estorno');
CREATE TYPE public.stock_mov_tipo AS ENUM ('entrada','saida','ajuste','perda');
CREATE TYPE public.prod_status AS ENUM ('planejada','em_producao','concluida','cancelada');
CREATE TYPE public.fin_tipo AS ENUM ('receita','despesa');
CREATE TYPE public.fin_status AS ENUM ('pago','pendente','atrasado');

-- Shared timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- USER ROLES (no recursion) ----------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "authenticated read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'proprietario') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'proprietario') OR public.has_role(auth.uid(),'admin'));

-- ---------- ROLE PERMISSIONS ----------
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read perms" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage perms" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'proprietario') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'proprietario') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_role_permissions_upd BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Fix profiles trigger so id = auth.uid ----------
-- current profiles table uses (id, user_id). Ensure id = NEW.id.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, nome, email)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
-- ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- allow authenticated to read profiles (needed by mesas.tsx)
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- ---------- SETTINGS (single-row, id=1) ----------
CREATE TABLE public.settings (
  id INT PRIMARY KEY CHECK (id = 1),
  nome_estabelecimento TEXT NOT NULL DEFAULT 'Padaria Pão Dourado',
  descricao TEXT DEFAULT 'Pães artesanais, bolos, doces e cafés todos os dias.',
  horario_funcionamento TEXT DEFAULT 'Seg-Sáb 06h-20h · Dom 07h-13h',
  telefone TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  aceita_pedidos_online BOOLEAN NOT NULL DEFAULT true,
  whatsapp_suporte TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "auth update settings" ON public.settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_settings_upd BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- CATEGORIES ----------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icone TEXT DEFAULT 'Utensils',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read cats" ON public.categories FOR SELECT USING (true);
CREATE POLICY "auth manage cats" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_categories_upd BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PRODUCTS ----------
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  slug TEXT,
  codigo TEXT,
  codigo_barras TEXT,
  descricao TEXT DEFAULT '',
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_promo NUMERIC(10,2),
  custo NUMERIC(10,2) DEFAULT 0,
  imagem_url TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  favorito BOOLEAN NOT NULL DEFAULT false,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  controla_estoque BOOLEAN NOT NULL DEFAULT false,
  estoque_atual NUMERIC(10,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_ativo ON public.products(ativo, disponivel);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "auth manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- COMPLEMENTS / ADICIONAIS ----------
CREATE TABLE public.complement_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  min_escolhas INT NOT NULL DEFAULT 0,
  max_escolhas INT NOT NULL DEFAULT 1,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.complement_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complement_groups TO authenticated;
GRANT ALL ON public.complement_groups TO service_role;
ALTER TABLE public.complement_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read compgroups" ON public.complement_groups FOR SELECT USING (true);
CREATE POLICY "auth manage compgroups" ON public.complement_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_compgroups_upd BEFORE UPDATE ON public.complement_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.complements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.complement_groups(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.complements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complements TO authenticated;
GRANT ALL ON public.complements TO service_role;
ALTER TABLE public.complements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read compl" ON public.complements FOR SELECT USING (true);
CREATE POLICY "auth manage compl" ON public.complements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.product_complement_groups (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.complement_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, group_id)
);
GRANT SELECT ON public.product_complement_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_complement_groups TO authenticated;
GRANT ALL ON public.product_complement_groups TO service_role;
ALTER TABLE public.product_complement_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pcg" ON public.product_complement_groups FOR SELECT USING (true);
CREATE POLICY "auth manage pcg" ON public.product_complement_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- COMBOS ----------
CREATE TABLE public.combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.combos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combos TO authenticated;
GRANT ALL ON public.combos TO service_role;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read combos" ON public.combos FOR SELECT USING (true);
CREATE POLICY "auth manage combos" ON public.combos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_combos_upd BEFORE UPDATE ON public.combos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantidade INT NOT NULL DEFAULT 1
);
GRANT SELECT ON public.combo_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_items TO authenticated;
GRANT ALL ON public.combo_items TO service_role;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read combo_items" ON public.combo_items FOR SELECT USING (true);
CREATE POLICY "auth manage combo_items" ON public.combo_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- RESTAURANT TABLES ----------
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE,
  capacidade INT NOT NULL DEFAULT 4,
  status public.table_status NOT NULL DEFAULT 'livre',
  pos_x NUMERIC DEFAULT 0,
  pos_y NUMERIC DEFAULT 0,
  ocupada_em TIMESTAMPTZ,
  reserva_nome TEXT,
  reserva_telefone TEXT,
  reserva_horario TIMESTAMPTZ,
  garcom_id UUID REFERENCES auth.users(id),
  mesa_pai_id UUID REFERENCES public.restaurant_tables(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tables" ON public.restaurant_tables FOR SELECT USING (true);
CREATE POLICY "auth manage tables" ON public.restaurant_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_tables_upd BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- TABLE HISTORY ----------
CREATE TABLE public.table_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_th_mesa ON public.table_history(mesa_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_history TO authenticated;
GRANT ALL ON public.table_history TO service_role;
ALTER TABLE public.table_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read th" ON public.table_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert th" ON public.table_history FOR INSERT TO authenticated WITH CHECK (true);

-- ---------- ORDERS ----------
CREATE SEQUENCE public.orders_numero_seq START 1000;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE DEFAULT nextval('public.orders_numero_seq'),
  cliente_nome TEXT NOT NULL DEFAULT '',
  cliente_telefone TEXT,
  cliente_endereco TEXT,
  cep TEXT,
  rua TEXT,
  numero_endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  complemento TEXT,
  ponto_referencia TEXT,
  mesa_id UUID REFERENCES public.restaurant_tables(id),
  garcom_id UUID REFERENCES auth.users(id),
  origem public.order_origem NOT NULL DEFAULT 'online',
  tipo public.order_tipo NOT NULL DEFAULT 'retirada',
  status public.order_status NOT NULL DEFAULT 'novo',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  troco_para NUMERIC(10,2),
  forma_pagamento public.pay_method,
  observacoes TEXT,
  horario_retirada TIMESTAMPTZ,
  finalizado_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  suspenso BOOLEAN NOT NULL DEFAULT false,
  suspenso_em TIMESTAMPTZ,
  suspenso_nome TEXT,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_status ON public.orders(status, created_at DESC);
CREATE INDEX idx_orders_mesa ON public.orders(mesa_id) WHERE mesa_id IS NOT NULL;
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.orders TO anon; -- public checkout / cardapio
GRANT USAGE ON SEQUENCE public.orders_numero_seq TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public read order by numero" ON public.orders FOR SELECT USING (true);
CREATE POLICY "auth manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- ORDER ITEMS ----------
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  combo_id UUID REFERENCES public.combos(id),
  produto_nome TEXT NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  complementos JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pendente',
  cancelado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oi_order ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert oi" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public read oi" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "auth manage oi" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- ORDER PAYMENTS (split / misto) ----------
CREATE TABLE public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  forma public.pay_method NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  troco NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage op" ON public.order_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- CASH SESSIONS ----------
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saldo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(10,2),
  diferenca NUMERIC(10,2),
  aberto_por UUID REFERENCES auth.users(id),
  fechado_por UUID REFERENCES auth.users(id),
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  status public.cash_status NOT NULL DEFAULT 'aberta',
  observacoes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cs" ON public.cash_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  tipo public.cash_mov_tipo NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  forma_pagamento public.pay_method,
  order_id UUID REFERENCES public.orders(id),
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cm_session ON public.cash_movements(session_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cm" ON public.cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- SUPPORT ----------
CREATE TABLE public.support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icone TEXT DEFAULT 'HelpCircle',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_categories TO authenticated;
GRANT ALL ON public.support_categories TO service_role;
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all sc" ON public.support_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sc_upd BEFORE UPDATE ON public.support_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.support_categories(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  causas TEXT[] DEFAULT '{}',
  passos TEXT[] DEFAULT '{}',
  observacoes TEXT DEFAULT '',
  imagem_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  doc_url TEXT DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_problems TO authenticated;
GRANT ALL ON public.support_problems TO service_role;
ALTER TABLE public.support_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all sp" ON public.support_problems FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sp_upd BEFORE UPDATE ON public.support_problems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.support_categories(id),
  problem_id UUID REFERENCES public.support_problems(id),
  categoria_nome TEXT,
  problema_titulo TEXT,
  descricao_adicional TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  encaminhado_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth own tickets" ON public.support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_st_upd BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  estrelas INT NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ratings TO authenticated;
GRANT ALL ON public.support_ratings TO service_role;
ALTER TABLE public.support_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all ratings" ON public.support_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- NEW MODULES: FILIAIS / SUPPLIERS / STOCK / PRODUCAO / FINANCEIRO / CUSTOMERS ----------
CREATE TABLE public.filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filiais TO authenticated;
GRANT ALL ON public.filiais TO service_role;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all filiais" ON public.filiais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fil_upd BEFORE UPDATE ON public.filiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sup_upd BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo public.stock_mov_tipo NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL,
  custo_unitario NUMERIC(10,2) DEFAULT 0,
  motivo TEXT DEFAULT '',
  supplier_id UUID REFERENCES public.suppliers(id),
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_prod ON public.stock_movements(product_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all sm" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.producao_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id),
  produto_nome TEXT NOT NULL,
  quantidade_planejada NUMERIC(10,3) NOT NULL DEFAULT 0,
  quantidade_produzida NUMERIC(10,3) NOT NULL DEFAULT 0,
  status public.prod_status NOT NULL DEFAULT 'planejada',
  data_producao DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_id UUID REFERENCES auth.users(id),
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_orders TO authenticated;
GRANT ALL ON public.producao_orders TO service_role;
ALTER TABLE public.producao_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all prod" ON public.producao_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_prod_upd BEFORE UPDATE ON public.producao_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financeiro_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.fin_tipo NOT NULL,
  categoria TEXT DEFAULT '',
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento public.pay_method,
  status public.fin_status NOT NULL DEFAULT 'pago',
  supplier_id UUID REFERENCES public.suppliers(id),
  order_id UUID REFERENCES public.orders(id),
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_data ON public.financeiro_movimentos(data DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_movimentos TO authenticated;
GRANT ALL ON public.financeiro_movimentos TO service_role;
ALTER TABLE public.financeiro_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fin" ON public.financeiro_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fin_upd BEFORE UPDATE ON public.financeiro_movimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  data_nascimento DATE,
  endereco_json JSONB DEFAULT '{}',
  credito NUMERIC(10,2) NOT NULL DEFAULT 0,
  pontos INT NOT NULL DEFAULT 0,
  observacoes TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cust_tel ON public.customers(telefone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cust" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cust_upd BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cargo TEXT DEFAULT '',
  cpf TEXT,
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  salario NUMERIC(10,2) DEFAULT 0,
  data_admissao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all emp" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_emp_upd BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- REALTIME publications ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_movements;

-- ---------- SEED DATA (enxuto) ----------
INSERT INTO public.settings (id, nome_estabelecimento, descricao, telefone, endereco, horario_funcionamento)
VALUES (1, 'Padaria Pão Dourado', 'Pães artesanais, bolos, pizzas, cafés e delivery.', '(11) 3333-4444',
        'Rua das Flores, 123 — Centro, São Paulo/SP', 'Seg-Sáb 06h-22h · Dom 07h-14h');

-- Categorias
INSERT INTO public.categories (id, nome, slug, icone, ordem) VALUES
  ('11111111-0000-0000-0000-000000000001','Pães','paes','Wheat',1),
  ('11111111-0000-0000-0000-000000000002','Bolos','bolos','Cake',2),
  ('11111111-0000-0000-0000-000000000003','Pizzas','pizzas','Pizza',3),
  ('11111111-0000-0000-0000-000000000004','Hambúrgueres','hamburgueres','Beef',4),
  ('11111111-0000-0000-0000-000000000005','Bebidas','bebidas','GlassWater',5),
  ('11111111-0000-0000-0000-000000000006','Sobremesas','sobremesas','IceCream',6),
  ('11111111-0000-0000-0000-000000000007','Cafés','cafes','Coffee',7),
  ('11111111-0000-0000-0000-000000000008','Salgados','salgados','Croissant',8),
  ('11111111-0000-0000-0000-000000000009','Combos','combos','Package',9);

-- Produtos (~30)
INSERT INTO public.products (nome, category_id, preco, descricao, ordem, imagem_url) VALUES
  ('Pão Francês (un)','11111111-0000-0000-0000-000000000001', 0.90,'Crocante por fora, macio por dentro',1,''),
  ('Pão de Forma Integral','11111111-0000-0000-0000-000000000001',12.00,'500g',2,''),
  ('Baguete Artesanal','11111111-0000-0000-0000-000000000001',9.50,'Fermentação natural',3,''),
  ('Pão de Queijo (un)','11111111-0000-0000-0000-000000000001',3.50,'Queijo minas curado',4,''),
  ('Bolo de Chocolate (fatia)','11111111-0000-0000-0000-000000000002',9.00,'Recheio cremoso',1,''),
  ('Bolo de Cenoura','11111111-0000-0000-0000-000000000002',8.00,'Cobertura de brigadeiro',2,''),
  ('Torta de Limão','11111111-0000-0000-0000-000000000002',11.00,'Merengue maçaricado',3,''),
  ('Pizza Margherita','11111111-0000-0000-0000-000000000003',55.00,'Molho, mussarela, manjericão',1,''),
  ('Pizza Calabresa','11111111-0000-0000-0000-000000000003',59.00,'Cebola e azeitona',2,''),
  ('Pizza Portuguesa','11111111-0000-0000-0000-000000000003',62.00,'Presunto, ovo, ervilha',3,''),
  ('X-Burguer Clássico','11111111-0000-0000-0000-000000000004',24.00,'180g + queijo',1,''),
  ('X-Bacon','11111111-0000-0000-0000-000000000004',28.00,'180g + bacon',2,''),
  ('X-Salada','11111111-0000-0000-0000-000000000004',26.00,'180g + salada',3,''),
  ('Suco de Laranja 300ml','11111111-0000-0000-0000-000000000005',9.00,'Natural',1,''),
  ('Refrigerante Lata','11111111-0000-0000-0000-000000000005',6.00,'350ml',2,''),
  ('Água Mineral 500ml','11111111-0000-0000-0000-000000000005',4.00,'Sem gás',3,''),
  ('Cerveja Long Neck','11111111-0000-0000-0000-000000000005',9.00,'Puro Malte',4,''),
  ('Brigadeiro (un)','11111111-0000-0000-0000-000000000006',3.50,'Gourmet',1,''),
  ('Pudim de Leite (fatia)','11111111-0000-0000-0000-000000000006',8.00,'Receita da casa',2,''),
  ('Sorvete 100g','11111111-0000-0000-0000-000000000006',10.00,'2 bolas',3,''),
  ('Espresso','11111111-0000-0000-0000-000000000007',5.50,'50ml',1,''),
  ('Cappuccino','11111111-0000-0000-0000-000000000007',9.00,'Espuma cremosa',2,''),
  ('Café com Leite','11111111-0000-0000-0000-000000000007',7.00,'Xícara 200ml',3,''),
  ('Coxinha de Frango','11111111-0000-0000-0000-000000000008',7.50,'Massa dourada',1,''),
  ('Pastel de Carne','11111111-0000-0000-0000-000000000008',8.00,'Frito na hora',2,''),
  ('Empada de Palmito','11111111-0000-0000-0000-000000000008',7.00,'Massa amanteigada',3,''),
  ('Combo Café da Manhã','11111111-0000-0000-0000-000000000009',22.00,'Café + pão + queijo + presunto',1,''),
  ('Combo Lanche','11111111-0000-0000-0000-000000000009',35.00,'X-Burguer + suco + batata',2,''),
  ('Combo Pizza Família','11111111-0000-0000-0000-000000000009',75.00,'Pizza gg + refri 2L',3,'');

-- Complementos
INSERT INTO public.complement_groups (id, nome, min_escolhas, max_escolhas, obrigatorio) VALUES
  ('22222222-0000-0000-0000-000000000001','Ponto do Burguer',1,1,true),
  ('22222222-0000-0000-0000-000000000002','Adicionais Burguer',0,5,false),
  ('22222222-0000-0000-0000-000000000003','Borda da Pizza',0,1,false);
INSERT INTO public.complements (group_id, nome, preco, ordem) VALUES
  ('22222222-0000-0000-0000-000000000001','Ao ponto',0,1),
  ('22222222-0000-0000-0000-000000000001','Bem passado',0,2),
  ('22222222-0000-0000-0000-000000000001','Mal passado',0,3),
  ('22222222-0000-0000-0000-000000000002','Bacon extra',5,1),
  ('22222222-0000-0000-0000-000000000002','Queijo extra',4,2),
  ('22222222-0000-0000-0000-000000000002','Ovo',3,3),
  ('22222222-0000-0000-0000-000000000003','Catupiry',8,1),
  ('22222222-0000-0000-0000-000000000003','Cheddar',7,2);

-- Mesas (10)
INSERT INTO public.restaurant_tables (numero, capacidade, pos_x, pos_y)
SELECT n, 4, ((n-1)%5)*140, ((n-1)/5)*140 FROM generate_series(1,10) n;

-- Clientes (10)
INSERT INTO public.customers (nome, telefone, email) VALUES
  ('Ana Souza','(11) 91111-0001','ana@example.com'),
  ('Bruno Lima','(11) 91111-0002','bruno@example.com'),
  ('Carla Mendes','(11) 91111-0003','carla@example.com'),
  ('Diego Alves','(11) 91111-0004','diego@example.com'),
  ('Elisa Rocha','(11) 91111-0005','elisa@example.com'),
  ('Fábio Costa','(11) 91111-0006','fabio@example.com'),
  ('Gisele Torres','(11) 91111-0007','gisele@example.com'),
  ('Heitor Prado','(11) 91111-0008','heitor@example.com'),
  ('Isabela Nunes','(11) 91111-0009','isabela@example.com'),
  ('João Ramos','(11) 91111-0010','joao@example.com');

-- Funcionários (3)
INSERT INTO public.employees (nome, cargo, telefone, salario, data_admissao) VALUES
  ('Marcos Silva','Padeiro','(11) 92222-0001',2800.00,'2024-03-01'),
  ('Renata Dias','Atendente/Caixa','(11) 92222-0002',2200.00,'2024-06-15'),
  ('Paulo Henrique','Entregador','(11) 92222-0003',2000.00,'2025-01-10');

-- Fornecedores
INSERT INTO public.suppliers (nome, contato, telefone, categoria) VALUES
  ('Farinhas do Sul','Sr. Oliveira','(11) 93333-1111','Ingredientes'),
  ('Distribuidora Bebidas SP','Carlos','(11) 93333-2222','Bebidas'),
  ('Laticínios Serra','Marcelo','(11) 93333-3333','Laticínios');

-- Pedidos históricos (20) — distribuídos nos últimos 30 dias
DO $$
DECLARE
  d INT; total NUMERIC; oid UUID;
  formas TEXT[] := ARRAY['pix','dinheiro','credito','debito'];
  tipos TEXT[]  := ARRAY['retirada','entrega','local'];
  origs TEXT[]  := ARRAY['online','pdv','mesa'];
BEGIN
  FOR d IN 1..20 LOOP
    total := round((30 + random()*120)::numeric, 2);
    INSERT INTO public.orders (cliente_nome, cliente_telefone, origem, tipo, status,
      subtotal, total, forma_pagamento, finalizado_em, created_at)
    VALUES (
      'Cliente Demo ' || d, '(11) 90000-00' || lpad(d::text,2,'0'),
      (origs[1+(d%3)])::public.order_origem,
      (tipos[1+(d%3)])::public.order_tipo,
      'finalizado'::public.order_status,
      total, total,
      (formas[1+(d%4)])::public.pay_method,
      now() - (d || ' days')::interval,
      now() - (d || ' days')::interval
    ) RETURNING id INTO oid;
    INSERT INTO public.order_items (order_id, produto_nome, quantidade, preco_unitario, subtotal)
    VALUES (oid, 'Item de demonstração ' || d, 1, total, total);
  END LOOP;
END $$;

-- Permissões padrão de módulos
INSERT INTO public.role_permissions (role, module, can_view, can_edit) VALUES
  ('proprietario','pdv',true,true),('proprietario','pedidos',true,true),('proprietario','mesas',true,true),
  ('proprietario','caixa',true,true),('proprietario','catalogo',true,true),('proprietario','vendas',true,true),
  ('proprietario','usuarios',true,true),('proprietario','configuracoes',true,true),
  ('admin','pdv',true,true),('admin','pedidos',true,true),('admin','mesas',true,true),
  ('admin','caixa',true,true),('admin','catalogo',true,true),('admin','vendas',true,true),
  ('admin','usuarios',true,true),('admin','configuracoes',true,true),
  ('gerente','pdv',true,true),('gerente','pedidos',true,true),('gerente','mesas',true,true),
  ('gerente','caixa',true,true),('gerente','catalogo',true,false),('gerente','vendas',true,false),
  ('operador','pdv',true,true),('operador','pedidos',true,false),('operador','mesas',true,true),('operador','caixa',true,false),
  ('garcom','mesas',true,true),('garcom','pedidos',true,false),
  ('caixa','pdv',true,true),('caixa','caixa',true,true),('caixa','pedidos',true,false),
  ('cozinha','pedidos',true,true);

-- Categorias & problemas de suporte iniciais
INSERT INTO public.support_categories (id, nome, slug, icone, ordem) VALUES
  ('33333333-0000-0000-0000-000000000001','Impressora','impressora','Printer',1),
  ('33333333-0000-0000-0000-000000000002','PDV','pdv','ShoppingCart',2),
  ('33333333-0000-0000-0000-000000000003','Cardápio Online','cardapio','Globe',3);
INSERT INTO public.support_problems (category_id, titulo, descricao, causas, passos) VALUES
  ('33333333-0000-0000-0000-000000000001','Impressora não imprime','Cupons não estão saindo',
   ARRAY['Sem papel','Cabo desconectado','Fila travada'],
   ARRAY['Verifique o papel','Reconecte o cabo USB','Reinicie a impressora','Tente reimprimir']),
  ('33333333-0000-0000-0000-000000000002','PDV lento','Sistema demora para carregar',
   ARRAY['Muitos pedidos abertos','Cache do navegador'],
   ARRAY['Feche pedidos antigos','Limpe cache (Ctrl+Shift+R)','Recarregue a página']),
  ('33333333-0000-0000-0000-000000000003','Pedidos não chegam','Novos pedidos online não aparecem',
   ARRAY['Realtime desconectado'],
   ARRAY['Recarregue a página','Verifique sua internet','Confira em Configurações']);

-- Filial padrão
INSERT INTO public.filiais (nome, endereco, telefone) VALUES
  ('Matriz — Centro','Rua das Flores, 123','(11) 3333-4444');

-- Movimentos financeiros de exemplo
INSERT INTO public.financeiro_movimentos (tipo, categoria, descricao, valor, data, forma_pagamento, status) VALUES
  ('despesa','Aluguel','Aluguel loja',3500.00, CURRENT_DATE - 5, 'pix','pago'),
  ('despesa','Insumos','Farinha e fermento',820.00, CURRENT_DATE - 3, 'pix','pago'),
  ('receita','Vendas do dia','Fechamento diário',1240.00, CURRENT_DATE - 1, 'multiplo','pago'),
  ('despesa','Salário','Adiantamento equipe',1500.00, CURRENT_DATE - 2, 'pix','pago');
