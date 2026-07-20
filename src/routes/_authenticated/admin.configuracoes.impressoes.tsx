import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/impressoes")({
  component: ImpSettings,
});

function ImpSettings() {
  const { state, setState, save, loading } = useSettingsConfig("impressoes", {
    caixa_ativa: true, caixa_nome: "PDV",
    cozinha_ativa: true, cozinha_nome: "Cozinha",
    bar_ativa: false, bar_nome: "Bar",
    producao_ativa: false, producao_nome: "Produção",
    vias: 1,
    auto_print: true,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const printer = (keyAtiva: string, keyNome: string, label: string) => (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center rounded-md border border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={(state as any)[keyAtiva]} onCheckedChange={(v) => setState({ ...state, [keyAtiva]: v } as any)} />
        {label}
      </label>
      <Input placeholder="Nome/identificação" value={(state as any)[keyNome]} onChange={(e) => setState({ ...state, [keyNome]: e.target.value } as any)} />
    </div>
  );

  return (
    <SectionShell title="Impressões" desc="Impressoras vinculadas e vias de impressão." onSave={() => save.mutate({})} saving={save.isPending}>
      {printer("caixa_ativa", "caixa_nome", "Caixa")}
      {printer("cozinha_ativa", "cozinha_nome", "Cozinha")}
      {printer("bar_ativa", "bar_nome", "Bar")}
      {printer("producao_ativa", "producao_nome", "Produção")}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Quantidade de vias por comanda</Label><Input type="number" min={1} value={state.vias} onChange={(e) => setState({ ...state, vias: Number(e.target.value) })} /></div>
      </div>
      <label className="flex items-center justify-between rounded-md border border-border p-3">
        <span className="text-sm">Impressão automática ao aprovar pedido</span>
        <Switch checked={state.auto_print} onCheckedChange={(v) => setState({ ...state, auto_print: v })} />
      </label>
    </SectionShell>
  );
}
