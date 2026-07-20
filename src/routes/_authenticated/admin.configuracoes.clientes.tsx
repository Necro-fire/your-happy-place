import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/clientes")({
  component: ClientesSettings,
});

function ClientesSettings() {
  const { state, setState, save, loading } = useSettingsConfig("clientes", {
    cadastro_obrigatorio: false,
    permite_avaliacao: true,
    permite_historico: true,
    permite_fidelidade: true,
    permite_cashback: false,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Clientes" desc="Como o sistema trata o cadastro e o relacionamento com clientes." onSave={() => save.mutate({})} saving={save.isPending}>
      <div className="space-y-2">
        {[
          ["cadastro_obrigatorio", "Exigir cadastro para finalizar pedido"],
          ["permite_avaliacao", "Permitir avaliação após pedido"],
          ["permite_historico", "Mostrar histórico de compras do cliente"],
          ["permite_fidelidade", "Ativar programa de fidelidade"],
          ["permite_cashback", "Ativar cashback"],
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
