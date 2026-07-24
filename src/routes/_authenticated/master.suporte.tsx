import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Save, Send, Phone } from "lucide-react";
import { toast } from "sonner";
import { openSupportWhatsApp, type PlatformSupport } from "@/hooks/use-support-contact";

export const Route = createFileRoute("/_authenticated/master/suporte")({
  component: MasterSuportePage,
});

function formatWhats(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 15);
  if (!d) return "";
  return "+" + d;
}

function MasterSuportePage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async (): Promise<PlatformSupport> => {
      const { data } = await supabase
        .from("platform_settings" as any)
        .select("suporte_whatsapp, suporte_nome, suporte_mensagem")
        .maybeSingle();
      return (data as any) ?? { suporte_whatsapp: null, suporte_nome: null, suporte_mensagem: null };
    },
  });

  const [whats, setWhats] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) {
      setWhats(q.data.suporte_whatsapp ?? "");
      setNome(q.data.suporte_nome ?? "");
      setMsg(q.data.suporte_mensagem ?? "");
    }
  }, [q.data]);

  function validNumber(v: string) {
    const d = v.replace(/\D/g, "");
    // DDI (1-3) + DDD (2) + número (8-9) => min ~11 dígitos
    return d.length >= 11 && d.length <= 15;
  }

  async function salvar() {
    if (whats && !validNumber(whats)) {
      toast.error("Número inválido. Informe DDI + DDD + número (ex: +55 11 99999-9999).");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert(
        {
          id: true,
          suporte_whatsapp: whats ? whats.replace(/\D/g, "") : null,
          suporte_nome: nome || null,
          suporte_mensagem: msg || null,
        } as any,
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração de suporte salva.");
    qc.invalidateQueries({ queryKey: ["platform_settings"] });
  }

  function testar() {
    openSupportWhatsApp(
      {
        suporte_whatsapp: whats.replace(/\D/g, "") || null,
        suporte_nome: nome || null,
        suporte_mensagem: msg || null,
      },
      "Mensagem de teste enviada pelo painel do Desenvolvedor Master.",
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Configure o número oficial de WhatsApp do suporte. Esse número é usado por todo o sistema
          (público, administrador e master).
        </p>
      </div>

      <Card className="max-w-2xl space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="whats">
            <Phone className="mr-1 inline h-4 w-4" /> Número do WhatsApp (com DDI e DDD)
          </Label>
          <Input
            id="whats"
            value={whats}
            onChange={(e) => setWhats(formatWhats(e.target.value))}
            placeholder="+55 11 99999-9999"
            inputMode="tel"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Somente números; inclua o código do país (55 para Brasil).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome do suporte (opcional)</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Suporte SaborSys"
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="msg">Mensagem padrão inicial (opcional)</Label>
          <Textarea
            id="msg"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Olá! Preciso de ajuda com o sistema."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={salvar} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={testar}>
            <MessageCircle className="mr-2 h-4 w-4" /> Testar WhatsApp
          </Button>
        </div>
      </Card>

      <Card className="max-w-2xl space-y-2 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Send className="h-4 w-4" /> Como funciona
        </div>
        <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Todos os botões "Falar com o suporte" / "Entrar em contato" usam esse número.</li>
          <li>Se o número estiver vazio, o sistema informa que o suporte não foi configurado.</li>
          <li>Somente o Desenvolvedor Master pode alterar essa configuração.</li>
        </ul>
      </Card>
    </div>
  );
}
