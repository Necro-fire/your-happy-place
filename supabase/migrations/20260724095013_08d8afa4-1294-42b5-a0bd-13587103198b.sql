
-- Subscription plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  preco_mensal numeric NOT NULL DEFAULT 0,
  preco_trimestral numeric NOT NULL DEFAULT 0,
  preco_anual numeric NOT NULL DEFAULT 0,
  trial_dias integer NOT NULL DEFAULT 0,
  renovacao_automatica boolean NOT NULL DEFAULT true,
  em_breve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Master manages plans" ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'master')) WITH CHECK (has_role(auth.uid(), 'master'));
CREATE TRIGGER trg_sub_plans_upd BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Benefits
CREATE TABLE public.subscription_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  texto text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_benefits TO anon, authenticated;
GRANT ALL ON public.subscription_benefits TO service_role;
ALTER TABLE public.subscription_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read benefits" ON public.subscription_benefits FOR SELECT USING (true);
CREATE POLICY "Master manages benefits" ON public.subscription_benefits FOR ALL
  USING (has_role(auth.uid(), 'master')) WITH CHECK (has_role(auth.uid(), 'master'));

-- Coupons
CREATE TABLE public.subscription_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('percentual','fixo')),
  valor numeric NOT NULL DEFAULT 0,
  validade date,
  limite_uso integer,
  usos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  aplicacao text NOT NULL DEFAULT 'manual' CHECK (aplicacao IN ('auto','manual')),
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_coupons TO authenticated;
GRANT ALL ON public.subscription_coupons TO service_role;
ALTER TABLE public.subscription_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read coupons" ON public.subscription_coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master manages coupons" ON public.subscription_coupons FOR ALL
  USING (has_role(auth.uid(), 'master')) WITH CHECK (has_role(auth.uid(), 'master'));
CREATE TRIGGER trg_sub_coupons_upd BEFORE UPDATE ON public.subscription_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.subscription_plans (slug, nome, ordem, preco_mensal, preco_trimestral, preco_anual, trial_dias, ativo, em_breve)
VALUES
  ('basico', 'Plano Básico', 1, 49.90, 134.90, 499.00, 7, true, false),
  ('plus',   'Plano Plus',   2, 99.90, 269.90, 999.00, 7, true, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed benefits
INSERT INTO public.subscription_benefits (plan_id, texto, ordem)
SELECT id, x.texto, x.ordem FROM public.subscription_plans p,
LATERAL (VALUES
  ('PDV completo', 1),
  ('Cardápio digital público', 2),
  ('Gestão de mesas e comandas', 3),
  ('Controle de caixa', 4),
  ('Cadastro ilimitado de produtos', 5),
  ('Suporte via WhatsApp', 6)
) AS x(texto, ordem)
WHERE p.slug = 'basico';

INSERT INTO public.subscription_benefits (plan_id, texto, ordem)
SELECT id, x.texto, x.ordem FROM public.subscription_plans p,
LATERAL (VALUES
  ('Tudo do Plano Básico', 1),
  ('Multi-usuário com permissões', 2),
  ('Relatórios avançados', 3),
  ('Integração com iFood (em breve)', 4),
  ('Domínio personalizado', 5),
  ('Suporte prioritário', 6)
) AS x(texto, ordem)
WHERE p.slug = 'plus';
