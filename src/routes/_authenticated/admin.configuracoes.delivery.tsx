import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/delivery")({
  component: DeliverySettings,
});

function DeliverySettings() {
  const qc = useQueryClient();
  const s = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("id, taxa_entrega, aceita_pedidos_online").eq("id", 1).single()).data,
  });
  const [taxa, setTaxa] = useState<string>("");
  const [aceita, setAceita] = useState(false);
  useEffect(() => {
    if (s.data) { setTaxa(String(s.data.taxa_entrega ?? 0)); setAceita(!!s.data.aceita_pedidos_online); }
  }, [s.data]);

  const saveBase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("settings").update({ taxa_entrega: Number(taxa) || 0, aceita_pedidos_online: aceita } as any).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Delivery atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const { state, setState, save } = useSettingsConfig("delivery", {
    modo_taxa: "fixa" as "fixa" | "distancia",
    taxa_por_km: 2,
    tempo_medio_min: 45,
    horario_inicio: "18:00",
    horario_fim: "23:00",
    areas_atendidas: "",
  });

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Delivery</h2>
          <p className="mt-1 text-sm text-muted-foreground">Taxas, áreas atendidas e horários de entrega.</p>
        </div>
        <label className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="text-sm">Aceitar pedidos de delivery online</span>
          <Switch checked={aceita} onCheckedChange={setAceita} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Modo de cobrança</Label>
            <select className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm" value={state?.modo_taxa ?? "fixa"} onChange={(e) => setState({ ...(state as any), modo_taxa: e.target.value as any })}>
              <option value="fixa">Taxa fixa</option>
              <option value="distancia">Por distância (km)</option>
            </select>
          </div>
          <div>
            <Label>Taxa fixa (R$)</Label>
            <Input type="number" step="0.01" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
          </div>
          <div>
            <Label>Valor por km (R$)</Label>
            <Input type="number" step="0.01" value={state?.taxa_por_km ?? 0} onChange={(e) => setState({ ...(state as any), taxa_por_km: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Tempo médio (min)</Label>
            <Input type="number" value={state?.tempo_medio_min ?? 0} onChange={(e) => setState({ ...(state as any), tempo_medio_min: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Horário de início</Label>
            <Input type="time" value={state?.horario_inicio ?? ""} onChange={(e) => setState({ ...(state as any), horario_inicio: e.target.value })} />
          </div>
          <div>
            <Label>Horário de encerramento</Label>
            <Input type="time" value={state?.horario_fim ?? ""} onChange={(e) => setState({ ...(state as any), horario_fim: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Áreas atendidas (bairros, cidades ou regiões — um por linha)</Label>
          <Textarea rows={4} value={state?.areas_atendidas ?? ""} onChange={(e) => setState({ ...(state as any), areas_atendidas: e.target.value })} placeholder="Centro&#10;Jardim América&#10;Vila Nova" />
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={async () => { await saveBase.mutateAsync(); save.mutate({}); }} disabled={saveBase.isPending || save.isPending}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
