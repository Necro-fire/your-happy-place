import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/estoque")({
  component: EstoqueSettings,
});

function EstoqueSettings() {
  const { state, setState, save, loading } = useSettingsConfig("estoque", {
    estoque_minimo_padrao: 5,
    alertas_ativos: true,
    baixa_automatica: true,
    controle_por_receita: false,
    unidade_padrao: "un",
    controle_validade: true,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Estoque" desc="Regras de controle, alertas e unidades." onSave={() => save.mutate({})} saving={save.isPending}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Estoque mínimo padrão</Label><Input type="number" value={state.estoque_minimo_padrao} onChange={(e) => setState({ ...state, estoque_minimo_padrao: Number(e.target.value) })} /></div>
        <div><Label>Unidade padrão</Label><Input value={state.unidade_padrao} onChange={(e) => setState({ ...state, unidade_padrao: e.target.value })} placeholder="un, kg, L..." /></div>
      </div>
      <div className="space-y-2">
        {[
          ["alertas_ativos", "Alertar quando produto atingir estoque mínimo"],
          ["baixa_automatica", "Baixar estoque automaticamente ao registrar venda"],
          ["controle_por_receita", "Controlar estoque por ficha técnica/receita"],
          ["controle_validade", "Controlar validade dos produtos"],
        ].map(([k, l]) => (
          <label key={k} className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm">{l}</span>
            <Switch checked={(state as any)[k]} onCheckedChange={(v) => setState({ ...state, [k]: v } as any)} />
          </label>
        ))}
      </div>
    </SectionShell>
  );
}
