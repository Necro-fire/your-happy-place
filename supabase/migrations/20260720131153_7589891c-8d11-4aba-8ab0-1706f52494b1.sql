
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','categories','combos','combo_items','complements','complement_groups',
    'product_complement_groups','orders','order_items','order_payments',
    'cash_sessions','cash_movements','stock_movements','financeiro_movimentos',
    'restaurant_tables','table_history','producao_orders','service_orders',
    'suppliers','clients','customers','employees','settings','company_settings',
    'role_permissions','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);
  END LOOP;
END $$;
