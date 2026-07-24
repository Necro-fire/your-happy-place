import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PlatformSupport = {
  suporte_whatsapp: string | null;
  suporte_nome: string | null;
  suporte_mensagem: string | null;
};

export function usePlatformSupport() {
  return useQuery({
    queryKey: ["platform_settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<PlatformSupport> => {
      const { data } = await supabase
        .from("platform_settings" as any)
        .select("suporte_whatsapp, suporte_nome, suporte_mensagem")
        .maybeSingle();
      return (data as any) ?? { suporte_whatsapp: null, suporte_nome: null, suporte_mensagem: null };
    },
  });
}

export function normalizeWhatsAppNumber(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** Returns true if opened. Shows a toast and returns false if not configured. */
export function openSupportWhatsApp(
  cfg: PlatformSupport | undefined | null,
  extraMessage?: string,
): boolean {
  const numero = normalizeWhatsAppNumber(cfg?.suporte_whatsapp);
  if (!numero) {
    toast.error("O suporte via WhatsApp ainda não foi configurado pelo desenvolvedor.");
    return false;
  }
  const base = cfg?.suporte_mensagem?.trim() || "Olá! Preciso de ajuda.";
  const msg = extraMessage ? `${base}\n\n${extraMessage}` : base;
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener");
  return true;
}
