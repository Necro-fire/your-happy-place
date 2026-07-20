
CREATE OR REPLACE FUNCTION public.slugify(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(txt, ''))),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

CREATE OR REPLACE FUNCTION public.gen_tenant_slug(base text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  s text;
  candidate text;
  i int := 1;
BEGIN
  s := public.slugify(base);
  IF s IS NULL OR length(s) < 2 THEN
    s := 'loja-' || lower(substr(md5(random()::text), 1, 6));
  END IF;
  candidate := s;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate) LOOP
    i := i + 1;
    candidate := s || '-' || i;
  END LOOP;
  RETURN candidate;
END $$;
