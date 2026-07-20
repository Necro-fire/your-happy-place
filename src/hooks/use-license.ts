import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LicenseStatus = "pendente" | "ativa" | "suspensa" | "bloqueada" | "expirada" | "cancelada";

export type MyLicense = {
  id: string;
  codigo: string;
  situacao: LicenseStatus;
  plano: string;
  tipo: string;
  vence_em: string | null;
  tenant_id: string | null;
  /** Server "now" ISO timestamp captured at fetch time (base for countdown). */
  server_now: string;
  /** Client performance.now() snapshot captured alongside server_now. */
  fetched_perf: number;
};

export function useMyLicense() {
  return useQuery({
    queryKey: ["my-license"],
    queryFn: async (): Promise<MyLicense | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_user_id", u.user.id)
        .maybeSingle();
      if (!tenant) return null;
      const [licRes, nowRes] = await Promise.all([
        supabase
          .from("licenses")
          .select("id, codigo, situacao, plano, tipo, vence_em, tenant_id")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc("server_now"),
      ]);
      if (!licRes.data) return null;
      const server_now = (nowRes.data as unknown as string) ?? new Date().toISOString();
      return { ...(licRes.data as Omit<MyLicense, "server_now" | "fetched_perf">), server_now, fetched_perf: performance.now() };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Compute remaining ms using server clock, not the device clock. */
export function remainingMs(license: Pick<MyLicense, "vence_em" | "server_now" | "fetched_perf"> | null | undefined): number | null {
  if (!license?.vence_em) return null;
  const elapsed = performance.now() - license.fetched_perf;
  const serverNow = new Date(license.server_now).getTime() + elapsed;
  return new Date(license.vence_em).getTime() - serverNow;
}
