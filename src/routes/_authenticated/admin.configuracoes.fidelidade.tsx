import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/fidelidade")({
  component: FidelidadeSettings,
});

function FidelidadeSettings() {
  const { state, setState, save, loading } = useSettingsConfig("fidelidade", {
    ativo: true,
    pontos_por_real: 1,
    cashback_pct: 5,
    validade_pontos_dias: 180,
    resgate_minimo: 100,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Fidelidade" desc="Pontos por compra, cashback e regras de resgate." onSave={() => save.mutate({})} saving={save.isPending}>
      <label className="flex items-center justify-between rounded-md border border-border p-3">
        <span className="text-sm">Programa de fidelidade ativo</span>
        <Switch checked={state.ativo} onCheckedChange={(v) => setState({ ...state, ativo: v })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Pontos por R$ 1,00</Label><Input type="number" step="0.01" value={state.pontos_por_real} onChange={(e) => setState({ ...state, pontos_por_real: Number(e.target.value) })} /></div>
        <div><Label>Cashback (%)</Label><Input type="number" step="0.1" value={state.cashback_pct} onChange={(e) => setState({ ...state, cashback_pct: Number(e.target.value) })} /></div>
        <div><Label>Validade dos pontos (dias)</Label><Input type="number" value={state.validade_pontos_dias} onChange={(e) => setState({ ...state, validade_pontos_dias: Number(e.target.value) })} /></div>
        <div><Label>Pontos mínimos para resgate</Label><Input type="number" value={state.resgate_minimo} onChange={(e) => setState({ ...state, resgate_minimo: Number(e.target.value) })} /></div>
      </div>
    </SectionShell>
  );
}
