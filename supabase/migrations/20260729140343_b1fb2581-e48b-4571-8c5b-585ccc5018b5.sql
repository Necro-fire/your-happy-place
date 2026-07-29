
CREATE TABLE public.subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','em_breve')),
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_features TO anon, authenticated;
GRANT ALL ON public.subscription_features TO service_role;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "features_select_all" ON public.subscription_features FOR SELECT USING (true);
CREATE POLICY "features_master_write" ON public.subscription_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER trg_features_updated
  BEFORE UPDATE ON public.subscription_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subscription_feature_plans (
  feature_id uuid NOT NULL REFERENCES public.subscription_features(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (feature_id, plan_id)
);

GRANT SELECT ON public.subscription_feature_plans TO anon, authenticated;
GRANT ALL ON public.subscription_feature_plans TO service_role;
ALTER TABLE public.subscription_feature_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_plans_select_all" ON public.subscription_feature_plans FOR SELECT USING (true);
CREATE POLICY "feature_plans_master_write" ON public.subscription_feature_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_features;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_feature_plans;
