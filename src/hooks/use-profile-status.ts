import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProfileRow = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

export async function fetchMyProfile(): Promise<ProfileRow | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
    staleTime: 60_000,
  });
}

export function isProfileComplete(p: ProfileRow | null | undefined) {
  if (!p) return false;
  return Boolean(p.nome?.trim() && p.email?.trim() && p.telefone?.trim());
}

export function isCompanyComplete(s: any | null | undefined) {
  if (!s) return false;
  const cfg = (s.config ?? {}) as any;
  const emp = (cfg.empresa ?? {}) as any;
  const requiredRoot = [
    s.nome_estabelecimento,
    s.telefone,
    s.whatsapp,
    s.email,
    s.cep,
    s.endereco,
    s.cidade,
    s.estado,
  ];
  const requiredCfg = [emp.bairro, emp.pais];
  const dias = Array.isArray(s.dias_funcionamento) ? s.dias_funcionamento : [];
  return (
    requiredRoot.every((v) => typeof v === "string" && v.trim().length > 0) &&
    requiredCfg.every((v) => typeof v === "string" && v.trim().length > 0) &&
    dias.length > 0
  );
}

export function missingLabels(profile: ProfileRow | null | undefined, settings: any) {
  const missing: string[] = [];
  if (!isProfileComplete(profile ?? null)) missing.push("Dados Pessoais");
  if (!isCompanyComplete(settings)) missing.push("Dados da Empresa");
  return missing;
}
