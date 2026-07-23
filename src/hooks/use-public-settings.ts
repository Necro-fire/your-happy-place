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

export type HeroMode = "banner" | "carousel";

export type DesignConfig = {
  logo_url: string | null;
  banner_url: string | null;
  cover_url: string | null;
  carrossel: CarrosselItem[];
  galeria: string[];
  hero_mode: HeroMode;
};

export const EMPTY_DESIGN: DesignConfig = {
  logo_url: null,
  banner_url: null,
  cover_url: null,
  carrossel: [],
  galeria: [],
  hero_mode: "banner",
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
      const { data } = await (supabase as any).rpc("get_public_menu_settings", { _tenant_id: tenantId });
      const s: any = Array.isArray(data) ? data[0] ?? {} : data ?? {};
      const design: DesignConfig = { ...EMPTY_DESIGN, ...((s.design as any) ?? {}) };
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
