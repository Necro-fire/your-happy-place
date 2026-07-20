import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Copy, ExternalLink, QrCode, RefreshCw, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/cardapio-publico")({
  component: CardapioPublicoPage,
});

function origin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function CardapioPublicoPage() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const tenantQ = useQuery({
    queryKey: ["my-tenant-public"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("tenants" as any)
        .select("id, menu_codigo, slug, public_codigo, nome")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      return data as any;
    },
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      if (!tenantQ.data?.id) throw new Error("Loja não encontrada");
      const { data, error } = await supabase.rpc("gen_public_codigo" as any);
      if (error) throw error;
      const novo = data as unknown as string;
      const { error: upErr } = await supabase
        .from("tenants" as any)
        .update({ public_codigo: novo })
        .eq("id", tenantQ.data.id);
      if (upErr) throw upErr;
      return novo;
    },
    onSuccess: () => {
      toast.success("Novo código público gerado");
      qc.invalidateQueries({ queryKey: ["my-tenant-public"] });
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível gerar um novo código"),
  });

  const codigo: string | null = tenantQ.data?.public_codigo ?? null;
  const url = codigo ? `${origin()}/c/${codigo}` : "";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function downloadQr() {
    const svg = document.getElementById("qr-public") as unknown as SVGSVGElement | null;
    if (!svg) return;
    const s = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" standalone="no"?>\n${s}`], { type: "image/svg+xml;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `qr-cardapio-${codigo}.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" /> Cardápio Público
        </h1>
        <p className="text-sm text-muted-foreground">
          Sua loja possui uma URL pública exclusiva. Compartilhe com seus clientes — qualquer pessoa
          acessa o cardápio direto pelo link, sem login.
        </p>
      </div>

      {tenantQ.isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Carregando...</Card>
      ) : !codigo ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum código público disponível para esta loja.
        </Card>
      ) : (
        <Card className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
            <div className="grid place-items-center rounded-lg border border-border bg-white p-4">
              <QRCodeSVG id="qr-public" value={url} size={180} level="H" includeMargin />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Código público</div>
                <div className="mt-1 font-mono text-2xl font-bold tracking-widest">{codigo}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">URL pública</div>
                <div className="mt-1 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                  {url}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button onClick={copy}>
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? "Copiado" : "Copiar Link"}
            </Button>
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" /> Abrir Cardápio
              </a>
            </Button>
            <Button variant="outline" onClick={downloadQr}>
              <QrCode className="mr-1 h-4 w-4" /> Baixar QR Code
            </Button>
            <Button
              variant="ghost"
              className="ml-auto text-muted-foreground"
              onClick={() => {
                if (confirm("Ao gerar um novo código, o link anterior deixará de funcionar. Deseja continuar?")) {
                  regenerate.mutate();
                }
              }}
              disabled={regenerate.isPending}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`} />
              Gerar novo código
            </Button>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Como funciona:</strong> o código público é aleatório e único
            no sistema. Ele não expõe dados internos e serve apenas para exibir o cardápio — nunca dá acesso
            à sua área administrativa.
          </div>
        </Card>
      )}
    </div>
  );
}
