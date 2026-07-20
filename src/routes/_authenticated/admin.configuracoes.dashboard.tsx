import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/dashboard")({
  component: DashSettings,
});

const CARDS = [
  ["vendas_dia", "Vendas do dia"],
  ["mais_vendidos", "Produtos mais vendidos"],
  ["lucro", "Lucro"],
  ["estoque", "Alertas de estoque"],
  ["ticket_medio", "Ticket médio"],
  ["comparativo_semana", "Comparativo semanal"],
] as const;

function DashSettings() {
  const { state, setState, save, loading } = useSettingsConfig("dashboard", Object.fromEntries(CARDS.map(([k]) => [k, true])) as Record<string, boolean>);
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Dashboard" desc="Escolha quais indicadores aparecem na tela inicial." onSave={() => save.mutate({})} saving={save.isPending}>
      <div className="space-y-2">
        {CARDS.map(([k, l]) => (
          <label key={k} className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm">{l}</span>
            <Switch checked={(state as any)[k]} onCheckedChange={(v) => setState({ ...state, [k]: v } as any)} />
          </label>
        ))}
      </div>
    </SectionShell>
  );
}
