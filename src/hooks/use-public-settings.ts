import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
};

export function usePublicSettings() {
  return useQuery({
    queryKey: ["public-settings"],
    queryFn: async (): Promise<PublicSettings> => {
      const { data } = await supabase
        .from("settings")
        .select("nome_estabelecimento, nome_fantasia, descricao, logo_url, telefone, whatsapp, email, endereco, cidade, estado, cep")
        .eq("id", 1)
        .maybeSingle();
      const s: any = data ?? {};
      return {
        nome: s.nome_fantasia || s.nome_estabelecimento || "Meu Estabelecimento",
        descricao: s.descricao ?? null,
        logo_url: s.logo_url ?? null,
        telefone: s.telefone ?? null,
        whatsapp: s.whatsapp ?? null,
        email: s.email ?? null,
        endereco: s.endereco ?? null,
        cidade: s.cidade ?? null,
        estado: s.estado ?? null,
        cep: s.cep ?? null,
      };
    },
    staleTime: 60_000,
  });
}
