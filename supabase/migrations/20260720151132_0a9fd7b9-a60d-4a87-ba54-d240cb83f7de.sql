
CREATE OR REPLACE FUNCTION public.get_public_menu(_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'categories', COALESCE((
      SELECT jsonb_agg(c ORDER BY c.ordem, c.nome) FROM (
        SELECT id, nome, slug, icone, ordem, descricao, cor
        FROM public.categories
        WHERE tenant_id = _tenant_id AND ativo = true
        ORDER BY ordem, nome
      ) c
    ), '[]'::jsonb),
    'products', COALESCE((
      SELECT jsonb_agg(p ORDER BY p.ordem, p.nome) FROM (
        SELECT id, category_id, nome, slug, descricao, preco, preco_promo,
               imagem_url, unidade, destaque, favorito, ordem
        FROM public.products
        WHERE tenant_id = _tenant_id
          AND ativo = true
          AND disponivel = true
        ORDER BY ordem, nome
      ) p
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_menu(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_menu(uuid) TO anon, authenticated;
