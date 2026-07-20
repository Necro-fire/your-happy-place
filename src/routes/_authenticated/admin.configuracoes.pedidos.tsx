import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/pedidos")({
  component: PedidosSettings,
});

function PedidosSettings() {
  const { state, setState, save, loading } = useSettingsConfig("pedidos", {
    tipo_mesa: true, tipo_delivery: true, tipo_retirada: true, tipo_balcao: true, tipo_autoatendimento: false,
    tempo_estimado_min: 30, impressao_automatica: true, observacao_obrigatoria: false,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <SectionShell title="Pedidos" desc="Defina quais tipos de pedido o estabelecimento aceita e como se comportam." onSave={() => save.mutate({})} saving={save.isPending}>
      <div>
        <Label className="text-sm font-semibold">Tipos de pedido</Label>
        <div className="mt-2 space-y-2">
          {[
            ["tipo_mesa", "Mesa"],
            ["tipo_delivery", "Delivery"],
            ["tipo_retirada", "Retirada"],
            ["tipo_balcao", "Balcão"],
            ["tipo_autoatendimento", "Autoatendimento"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm">{label}</span>
              <Switch checked={(state as any)[key]} onCheckedChange={(v) => setState({ ...state, [key]: v } as any)} />
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Tempo estimado padrão (minutos)</Label>
          <Input type="number" min={0} value={state.tempo_estimado_min} onChange={(e) => setState({ ...state, tempo_estimado_min: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="text-sm">Imprimir comanda automaticamente ao aprovar pedido</span>
          <Switch checked={state.impressao_automatica} onCheckedChange={(v) => setState({ ...state, impressao_automatica: v })} />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="text-sm">Exigir observação em cada item</span>
          <Switch checked={state.observacao_obrigatoria} onCheckedChange={(v) => setState({ ...state, observacao_obrigatoria: v })} />
        </label>
      </div>
    </SectionShell>
  );
}
