import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/pdv")({
  component: PdvSettings,
});

const PAGAMENTOS = [
  ["pix", "Pix"], ["dinheiro", "Dinheiro"], ["credito", "Crédito"], ["debito", "Débito"], ["vale", "Vale-refeição"],
] as const;

function PdvSettings() {
  const { state, setState, save, loading } = useSettingsConfig("pdv", {
    pagamentos: { pix: true, dinheiro: true, credito: true, debito: true, vale: false } as Record<string, boolean>,
    limite_desconto_pct: 10,
    venda_sem_cliente: true,
    venda_rapida: true,
    permite_cancelar: true,
    permite_alterar_preco: false,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <SectionShell title="PDV" desc="Configuração do ponto de venda: pagamentos, permissões e limites." onSave={() => save.mutate({})} saving={save.isPending}>
      <div>
        <Label className="text-sm font-semibold">Formas de pagamento aceitas</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PAGAMENTOS.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm">{label}</span>
              <Switch checked={state.pagamentos[key]} onCheckedChange={(v) => setState({ ...state, pagamentos: { ...state.pagamentos, [key]: v } })} />
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Limite de desconto (%)</Label>
          <Input type="number" min={0} max={100} value={state.limite_desconto_pct} onChange={(e) => setState({ ...state, limite_desconto_pct: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-2">
        {[
          ["venda_sem_cliente", "Permitir venda sem cliente identificado"],
          ["venda_rapida", "Habilitar modo venda rápida"],
          ["permite_cancelar", "Permitir cancelamento de itens e vendas"],
          ["permite_alterar_preco", "Permitir alterar preço no PDV"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm">{label}</span>
            <Switch checked={(state as any)[key]} onCheckedChange={(v) => setState({ ...state, [key]: v } as any)} />
          </label>
        ))}
      </div>
    </SectionShell>
  );
}
