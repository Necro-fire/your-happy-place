import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/caixa")({
  component: CaixaSettings,
});

function CaixaSettings() {
  const { state, setState, save, loading } = useSettingsConfig("caixa", {
    quantidade_caixas: 1,
    exigir_responsavel: true,
    exigir_saldo_inicial: true,
    permite_sangria: true,
    permite_suprimento: true,
    fechamento_obrigatorio: true,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Caixa" desc="Regras de abertura, movimentações e fechamento." onSave={() => save.mutate({})} saving={save.isPending}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Quantidade de caixas simultâneos</Label><Input type="number" min={1} value={state.quantidade_caixas} onChange={(e) => setState({ ...state, quantidade_caixas: Number(e.target.value) })} /></div>
      </div>
      <div className="space-y-2">
        {[
          ["exigir_responsavel", "Exigir responsável na abertura do caixa"],
          ["exigir_saldo_inicial", "Exigir informar saldo inicial"],
          ["permite_sangria", "Permitir sangria"],
          ["permite_suprimento", "Permitir suprimento"],
          ["fechamento_obrigatorio", "Exigir fechamento com conferência"],
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
