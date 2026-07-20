
CREATE OR REPLACE FUNCTION public.get_public_menu_settings(_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  nome_estabelecimento text,
  nome_fantasia text,
  descricao text,
  logo_url text,
  banner_url text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  cor_primaria text,
  cor_secundaria text,
  aceita_pedidos_online boolean,
  taxa_entrega numeric,
  horario_funcionamento text,
  dias_funcionamento text[],
  design jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.tenant_id, s.nome_estabelecimento, s.nome_fantasia, s.descricao,
    s.logo_url, s.banner_url, s.telefone, s.whatsapp, s.email,
    s.endereco, s.cidade, s.estado, s.cep, s.cor_primaria, s.cor_secundaria,
    s.aceita_pedidos_online, s.taxa_entrega, s.horario_funcionamento, s.dias_funcionamento,
    COALESCE(s.config->'design', '{}'::jsonb) AS design
  FROM public.settings s
  WHERE s.tenant_id = _tenant_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_menu_settings(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_menu_settings(uuid) TO anon, authenticated;
