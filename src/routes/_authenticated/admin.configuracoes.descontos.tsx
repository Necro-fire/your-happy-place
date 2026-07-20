import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";
import { cn } from "@/lib/utils";
import { Percent, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/descontos")({
  component: DescontosSettings,
});

type Tipo = "percentual" | "valor";

const ROLES = [
  { key: "owner", label: "Administrador" },
  { key: "manager", label: "Gerente" },
  { key: "cashier", label: "Operador de caixa" },
  { key: "waiter", label: "Garçom" },
] as const;

function DescontosSettings() {
  const { state, setState, save, loading } = useSettingsConfig("descontos", {
    ativo: true,
    tipo: "percentual" as Tipo,
    limite_pct: 20,
    limite_valor: 50,
    exigir_motivo: true,
    registrar_auditoria: true,
    permissoes: { owner: true, manager: true, cashier: false, waiter: false } as Record<string, boolean>,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <SectionShell
      title="Descontos"
      desc="Regras, limites e permissões para aplicação de descontos no PDV."
      onSave={() => save.mutate({})}
      saving={save.isPending}
    >
      <label className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <div className="text-sm font-medium">Permitir descontos no sistema</div>
          <div className="text-xs text-muted-foreground">Se desativado, nenhum usuário poderá aplicar descontos.</div>
        </div>
        <Switch checked={state.ativo} onCheckedChange={(v) => setState({ ...state, ativo: v })} />
      </label>

      <div>
        <Label className="text-sm font-semibold">Tipo de desconto</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([
            { key: "percentual", label: "Percentual (%)", icon: Percent, desc: "Aplica um desconto em porcentagem." },
            { key: "valor", label: "Valor fixo (R$)", icon: DollarSign, desc: "Aplica um valor fixo em reais." },
          ] as { key: Tipo; label: string; icon: any; desc: string }[]).map(({ key, label, icon: Icon, desc }) => {
            const active = state.tipo === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setState({ ...state, tipo: key })}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3 text-left transition",
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Limite máximo em percentual (%)</Label>
          <Input
            type="number" min={0} max={100}
            value={state.limite_pct}
            onChange={(e) => setState({ ...state, limite_pct: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Limite máximo em valor (R$)</Label>
          <Input
            type="number" min={0}
            value={state.limite_valor}
            onChange={(e) => setState({ ...state, limite_valor: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Quem pode aplicar desconto</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ROLES.map((r) => (
            <label key={r.key} className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm">{r.label}</span>
              <Switch
                checked={!!state.permissoes[r.key]}
                onCheckedChange={(v) => setState({ ...state, permissoes: { ...state.permissoes, [r.key]: v } })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm">Exigir motivo ao aplicar desconto</div>
            <div className="text-xs text-muted-foreground">Solicita justificativa antes de confirmar.</div>
          </div>
          <Switch checked={state.exigir_motivo} onCheckedChange={(v) => setState({ ...state, exigir_motivo: v })} />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm">Registrar em auditoria</div>
            <div className="text-xs text-muted-foreground">Salva usuário, venda, valor, data e motivo.</div>
          </div>
          <Switch checked={state.registrar_auditoria} onCheckedChange={(v) => setState({ ...state, registrar_auditoria: v })} />
        </label>
      </div>
    </SectionShell>
  );
}
