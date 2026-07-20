import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TenantSession = {
  tenant_id: string;
  codigo: string;
  slug?: string | null;
  nome?: string | null;
};

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

function toSession(data: any): TenantSession {
  return {
    tenant_id: data.id,
    codigo: data.menu_codigo,
    slug: data.slug ?? null,
    nome: data.nome,
  };
}

/** Look up a tenant by menu code and cache it in the session. */
export async function loadTenantByCodigo(codigo: string): Promise<TenantSession | null> {
  const clean = (codigo || "").trim().toUpperCase();
  if (!clean) return null;
  const { data } = await supabase
    .from("tenants" as any)
    .select("id, menu_codigo, slug, nome")
    .eq("menu_codigo", clean)
    .maybeSingle();
  if (!data) return null;
  const t = toSession(data);
  setTenant(t);
  return t;
}

/** Look up a tenant by friendly slug and cache it in the session. */
export async function loadTenantBySlug(slug: string): Promise<TenantSession | null> {
  const clean = (slug || "").trim().toLowerCase();
  if (!clean) return null;
  const { data } = await supabase
    .from("tenants" as any)
    .select("id, menu_codigo, slug, nome")
    .eq("slug", clean)
    .maybeSingle();
  if (!data) return null;
  const t = toSession(data);
  setTenant(t);
  return t;
}

/** Preferred public menu path for a tenant session (slug when available). */
export function publicMenuHref(t: Pick<TenantSession, "slug" | "codigo"> | null | undefined): string {
  if (!t) return "/";
  if (t.slug) return `/cardapio/${t.slug}`;
  if (t.codigo) return `/menu/${t.codigo}`;
  return "/";
}
