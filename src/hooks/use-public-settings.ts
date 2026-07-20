import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant-session";

export type CarrosselItem = {
  id: string;
  image_url: string;
  titulo?: string;
  descricao?: string;
  link?: string;
  ativo: boolean;
};

export type DesignConfig = {
  logo_url: string | null;
  banner_url: string | null;
  cover_url: string | null;
  carrossel: CarrosselItem[];
  galeria: string[];
};

export const EMPTY_DESIGN: DesignConfig = {
  logo_url: null,
  banner_url: null,
  cover_url: null,
  carrossel: [],
  galeria: [],
};

export type PublicSettings = {
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  design: DesignConfig;
};

export function usePublicSettings(tenantIdArg?: string | null) {
  const tenant = useTenant();
  const tenantId = tenantIdArg ?? tenant?.tenant_id ?? null;
  return useQuery({
    queryKey: ["public-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<PublicSettings> => {
      let query = supabase
        .from("settings")
        .select("nome_estabelecimento, nome_fantasia, descricao, logo_url, telefone, whatsapp, email, endereco, cidade, estado, cep, config, tenant_id" as any);
      if (tenantId) query = query.eq("tenant_id", tenantId) as any;
      const { data } = await query.maybeSingle();
      const s: any = data ?? {};
      const design: DesignConfig = { ...EMPTY_DESIGN, ...((s.config as any)?.design ?? {}) };
      return {
        nome: s.nome_fantasia || s.nome_estabelecimento || "Estabelecimento",
        descricao: s.descricao ?? null,
        logo_url: design.logo_url ?? s.logo_url ?? null,
        telefone: s.telefone ?? null,
        whatsapp: s.whatsapp ?? null,
        email: s.email ?? null,
        endereco: s.endereco ?? null,
        cidade: s.cidade ?? null,
        estado: s.estado ?? null,
        cep: s.cep ?? null,
        design,
      };
    },
    staleTime: 60_000,
  });
}
