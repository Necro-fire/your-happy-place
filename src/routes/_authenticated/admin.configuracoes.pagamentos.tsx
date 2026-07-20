import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/pagamentos")({
  component: PagamentosSettings,
});

type Method = { id: string; label: string; ativo: boolean; tipo: "dinheiro" | "pix" | "debito" | "credito" | "outro" };

const DEFAULTS = {
  metodos: [
    { id: "dinheiro", label: "Dinheiro", ativo: true, tipo: "dinheiro" },
    { id: "pix", label: "Pix", ativo: true, tipo: "pix" },
    { id: "debito", label: "Cartão de débito", ativo: true, tipo: "debito" },
    { id: "credito", label: "Cartão de crédito", ativo: true, tipo: "credito" },
  ] as Method[],
};

function PagamentosSettings() {
  const { state, setState, save, loading } = useSettingsConfig("pagamentos", DEFAULTS);
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const update = (i: number, patch: Partial<Method>) => {
    const next = [...state.metodos];
    next[i] = { ...next[i], ...patch };
    setState({ ...state, metodos: next });
  };
  const remove = (i: number) => setState({ ...state, metodos: state.metodos.filter((_, x) => x !== i) });
  const add = () =>
    setState({
      ...state,
      metodos: [...state.metodos, { id: `custom-${Date.now()}`, label: "Novo método", ativo: true, tipo: "outro" }],
    });

  return (
    <SectionShell
      title="Formas de pagamento"
      desc="Métodos aceitos no PDV. Refletem em Caixa, Financeiro e Relatórios."
      onSave={() => save.mutate({})}
      saving={save.isPending}
    >
      <div className="space-y-2">
        {state.metodos.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={m.label} onChange={(e) => update(i, { label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={m.tipo}
                  onChange={(e) => update(i, { tipo: e.target.value as Method["tipo"] })}
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <Switch checked={m.ativo} onCheckedChange={(v) => update(i, { ativo: v })} />
            <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remover">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={add} className="w-full">
          <Plus className="mr-1 h-4 w-4" /> Adicionar método
        </Button>
      </div>
    </SectionShell>
  );
}
