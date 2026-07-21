import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";
import { Store, Coffee, PackageCheck, Bike, Printer, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineLoader, InlineError } from "@/components/admin/InlineStates";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/pdv")({
  component: PdvSettings,
});

type PosVenda = "auto" | "perguntar" | "nao";

const TIPOS = [
  { key: "balcao", label: "Balcão", icon: Store, desc: "Venda direta no balcão" },
  { key: "retirada", label: "Retirada", icon: PackageCheck, desc: "Cliente retira no local" },
  { key: "mesa", label: "Mesa", icon: Coffee, desc: "Controle de mesas e comandas" },
  { key: "delivery", label: "Delivery", icon: Bike, desc: "Entrega com endereço e taxa" },
] as const;

const POS_VENDA: { key: PosVenda; label: string; desc: string; icon: any }[] = [
  { key: "auto", label: "Imprimir automaticamente", desc: "Imprime o comprovante ao finalizar", icon: Printer },
  { key: "perguntar", label: "Perguntar antes de imprimir", desc: "Sistema pergunta se deseja imprimir", icon: HelpCircle },
  { key: "nao", label: "Não imprimir", desc: "Finaliza a venda sem imprimir", icon: XCircle },
];

function PdvSettings() {
  const { state, setState, save, loading, error, refetch } = useSettingsConfig("pdv", {
    tipos_venda: { balcao: true, retirada: true, mesa: true, delivery: true } as Record<string, boolean>,
    pos_venda_impressao: "auto" as PosVenda,
  });
  if (loading) return <InlineLoader />;
  if (error) return <InlineError error={error} onRetry={() => refetch()} />;
  if (!state) return null;

  return (
    <SectionShell
      title="PDV"
      desc="Comportamento do ponto de venda. Formas de pagamento e descontos possuem módulos próprios."
      onSave={() => save.mutate({})}
      saving={save.isPending}
    >
      <div>
        <Label className="text-sm font-semibold">Tipos de venda disponíveis</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">Selecione quais formas de atendimento aparecem no PDV.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {TIPOS.map(({ key, label, desc, icon: Icon }) => {
            const active = !!state.tipos_venda[key];
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 transition",
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-md", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
                <Switch
                  checked={active}
                  onCheckedChange={(v) => setState({ ...state, tipos_venda: { ...state.tipos_venda, [key]: v } })}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Finalização de venda</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">Comportamento de impressão após concluir uma venda.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {POS_VENDA.map(({ key, label, desc, icon: Icon }) => {
            const active = state.pos_venda_impressao === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setState({ ...state, pos_venda_impressao: key })}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition",
                  active ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
