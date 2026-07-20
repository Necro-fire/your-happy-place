import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TenantSession = { tenant_id: string; codigo: string; nome?: string | null };

const KEY = "tenant_session_v1";

export function readTenant(): TenantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTenant(t: TenantSession | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(KEY, JSON.stringify(t));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tenant:update"));
}

export function useTenant() {
  const [t, setT] = useState<TenantSession | null>(null);
  useEffect(() => {
    setT(readTenant());
    const on = () => setT(readTenant());
    window.addEventListener("tenant:update", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("tenant:update", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return t;
}

/** Look up a tenant by menu code and cache it in the session. */
export async function loadTenantByCodigo(codigo: string): Promise<TenantSession | null> {
  const clean = (codigo || "").trim().toUpperCase();
  if (!clean) return null;
  const { data } = await supabase
    .from("tenants" as any)
    .select("id, menu_codigo, nome")
    .eq("menu_codigo", clean)
    .maybeSingle();
  if (!data) return null;
  const t: TenantSession = { tenant_id: (data as any).id, codigo: (data as any).menu_codigo, nome: (data as any).nome };
  setTenant(t);
  return t;
}
