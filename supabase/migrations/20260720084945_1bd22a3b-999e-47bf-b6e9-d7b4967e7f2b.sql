DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','categories','combos','combo_items','complements','complement_groups',
    'product_complement_groups','settings','restaurant_tables','orders','order_items',
    'cash_sessions','cash_movements','customers','employees','user_roles','role_permissions'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
             WHEN others THEN NULL;
    END;
  END LOOP;
END $$;