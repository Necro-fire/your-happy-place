-- Confirmar email + conceder papel master
UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE email = 'pa123@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'master'::app_role FROM auth.users WHERE email = 'pa123@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir profile
INSERT INTO public.profiles (id, user_id, nome, email)
SELECT id, id, 'Administrador Master', email FROM auth.users WHERE email = 'pa123@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL DEFAULT ('EMP-' || lpad((floor(random()*99999))::text, 5, '0')),
  nome text NOT NULL,
  empresa text,
  documento text,
  email text,
  telefone text,
  whatsapp text,
  cidade text,
  estado text,
  segmento text,
  plano text NOT NULL DEFAULT 'basico',
  status text NOT NULL DEFAULT 'ativo',
  versao_instalada text,
  ultimo_acesso timestamptz,
  ultima_sync timestamptz,
  ativado_em timestamptz DEFAULT now(),
  vence_em timestamptz,
  observacoes text,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master gerencia tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Licenses
CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL DEFAULT ('LIC-' || lpad((floor(random()*999999))::text, 6, '0')),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  plano text NOT NULL DEFAULT 'basico',
  tipo text NOT NULL DEFAULT 'mensal',
  situacao text NOT NULL DEFAULT 'ativa',
  emitida_em timestamptz NOT NULL DEFAULT now(),
  vence_em timestamptz,
  valor numeric(12,2) DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master gerencia licencas" ON public.licenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));
CREATE TRIGGER trg_licenses_updated BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Master logs
CREATE TABLE IF NOT EXISTS public.master_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.master_logs TO authenticated;
GRANT ALL ON public.master_logs TO service_role;
ALTER TABLE public.master_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master le logs" ON public.master_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'));
CREATE POLICY "master insere logs" ON public.master_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'master') AND actor_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_master_logs_created ON public.master_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON public.licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);