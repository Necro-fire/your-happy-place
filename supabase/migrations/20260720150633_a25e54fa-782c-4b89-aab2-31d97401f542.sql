ALTER VIEW public.public_menu_settings SET (security_invoker = true);
-- garantir SELECT anon nas settings apenas via view: view lê a tabela como o próprio anon.
-- criamos uma policy mínima só para SELECT das colunas usadas pela view (na prática, RLS é por linha).
CREATE POLICY "settings anon read for public view" ON public.settings FOR SELECT TO anon USING (true);
