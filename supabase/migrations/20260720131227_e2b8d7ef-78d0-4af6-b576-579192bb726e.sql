
CREATE POLICY "anon read settings" ON public.settings FOR SELECT TO anon USING (true);
