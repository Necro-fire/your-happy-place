DO $$
DECLARE uid uuid := 'bede2ef1-3c4c-4e0e-863e-f260b14bb400';
BEGIN
  DELETE FROM public.cash_movements WHERE criado_por = uid OR session_id IN (SELECT id FROM public.cash_sessions WHERE aberto_por = uid OR fechado_por = uid);
  DELETE FROM public.cash_sessions WHERE aberto_por = uid OR fechado_por = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles WHERE user_id = uid OR id = uid;
  DELETE FROM public.audit_logs WHERE user_id = uid;
  DELETE FROM public.master_logs WHERE actor_user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;