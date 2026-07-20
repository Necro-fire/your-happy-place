
-- 1) Trigger: sempre que uma ordem for marcada como 'cancelado', remove automaticamente
--    quaisquer lançamentos de caixa vinculados (garantia contra órfãos como o de #1026).
CREATE OR REPLACE FUNCTION public.delete_cash_movements_on_order_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelado' AND (OLD.status IS DISTINCT FROM 'cancelado') THEN
    DELETE FROM public.cash_movements WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_cash_movements_on_order_cancel ON public.orders;
CREATE TRIGGER trg_delete_cash_movements_on_order_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.delete_cash_movements_on_order_cancel();

-- 2) Limpeza de lançamentos órfãos existentes (pedidos já cancelados que ainda
--    possuem movimento no caixa — inclui o R$ 33,50 do pedido #1026).
DELETE FROM public.cash_movements cm
USING public.orders o
WHERE cm.order_id = o.id
  AND o.status = 'cancelado';
