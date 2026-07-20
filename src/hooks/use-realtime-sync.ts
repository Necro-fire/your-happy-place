import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime subscription that keeps Operations and Configurations in sync.
 * Any insert/update/delete on shared tables invalidates all React Query caches,
 * so changes made in Configurações reflect instantly in PDV/Caixa/Pedidos and vice-versa.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const tables = [
      "products",
      "categories",
      "combos",
      "combo_items",
      "complements",
      "complement_groups",
      "product_complement_groups",
      "settings",
      "restaurant_tables",
      "orders",
      "order_items",
      "cash_sessions",
      "cash_movements",
      "customers",
      "employees",
      "user_roles",
      "role_permissions",
    ];
    const channel = supabase.channel("global-sync");
    for (const t of tables) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: t },
        () => qc.invalidateQueries(),
      );
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
