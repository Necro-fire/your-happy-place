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
      const { data } = await supabase
        .from("licenses")
        .select("id, codigo, situacao, plano, tipo, vence_em, tenant_id")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as MyLicense | null) ?? null;
    },
    staleTime: 30_000,
  });
}
