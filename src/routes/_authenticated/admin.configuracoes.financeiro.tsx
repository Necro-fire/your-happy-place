import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/financeiro")({
  component: FinanceiroSettings,
});

const DEFAULTS = {
  moeda: "BRL",
  simbolo: "R$",
  casas_decimais: 2,
  separador_decimal: ",",
  separador_milhar: ".",
  categorias_receita: ["Vendas", "Serviços"] as string[],
  categorias_despesa: ["Fornecedores", "Salários", "Aluguel", "Impostos"] as string[],
};

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 space-y-1">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input value={it} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))} />
            <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function FinanceiroSettings() {
  const { state, setState, save, loading } = useSettingsConfig("financeiro", DEFAULTS);
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell
      title="Financeiro"
      desc="Moeda, formatação e categorias de movimentação. Impacta PDV, Caixa e Relatórios."
      onSave={() => save.mutate({})}
      saving={save.isPending}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Moeda</Label>
          <Input value={state.moeda} onChange={(e) => setState({ ...state, moeda: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <Label>Símbolo</Label>
          <Input value={state.simbolo} onChange={(e) => setState({ ...state, simbolo: e.target.value })} />
        </div>
        <div>
          <Label>Casas decimais</Label>
          <Input
            type="number"
            min={0}
            max={4}
            value={state.casas_decimais}
            onChange={(e) => setState({ ...state, casas_decimais: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ListEditor
          label="Categorias de receita"
          items={state.categorias_receita}
          onChange={(v) => setState({ ...state, categorias_receita: v })}
        />
        <ListEditor
          label="Categorias de despesa"
          items={state.categorias_despesa}
          onChange={(v) => setState({ ...state, categorias_despesa: v })}
        />
      </div>
    </SectionShell>
  );
}
