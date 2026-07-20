import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime subscription that keeps Operations and Configurations in sync.
 *
 * Performance notes:
 * - Uses ONE channel with per-table listeners (Supabase multiplexes them over
 *   a single websocket).
 * - Invalidations are SCOPED per table (query-key prefix) instead of a
 *   blanket qc.invalidateQueries() — a single order insert used to refetch
 *   every query in the app.
 * - Bursts of events are coalesced into a single microtask flush.
 */

type Invalidator = (qc: QueryClient) => void;

const inv = (...keys: string[]): Invalidator => (qc) => {
  for (const k of keys) qc.invalidateQueries({ queryKey: [k] });
};

const TABLE_INVALIDATORS: Record<string, Invalidator> = {
  products: inv("products", "public-menu", "stock"),
  categories: inv("categories", "public-menu"),
  combos: inv("combos"),
  combo_items: inv("combos"),
  complements: inv("complements"),
  complement_groups: inv("complements", "complement_groups"),
  product_complement_groups: inv("products", "complements"),
  settings: inv("settings", "public-settings", "app-settings"),
  restaurant_tables: inv("tables", "restaurant_tables"),
  orders: inv("orders", "sales", "cash"),
  order_items: inv("orders", "sales"),
  cash_sessions: inv("cash"),
  cash_movements: inv("cash"),
  customers: inv("customers"),
  employees: inv("employees"),
  user_roles: inv("user_roles", "profile"),
  role_permissions: inv("role_permissions"),
};

export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const pending = new Set<string>();
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      for (const t of pending) TABLE_INVALIDATORS[t]?.(qc);
      pending.clear();
    };
    const schedule = (t: string) => {
      pending.add(t);
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(flush);
    };

    const channel = supabase.channel("global-sync");
    for (const t of Object.keys(TABLE_INVALIDATORS)) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: t },
        () => schedule(t),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
