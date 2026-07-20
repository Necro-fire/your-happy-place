import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/seguranca")({
  component: SegSettings,
});

function SegSettings() {
  const { state, setState, save, loading } = useSettingsConfig("seguranca", {
    exigir_senha_forte: true,
    bloquear_apos_tentativas: 5,
    encerrar_sessao_min: 60,
    exigir_2fa_admin: false,
    log_acessos: true,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Segurança" desc="Regras de sessão, senhas e bloqueios." onSave={() => save.mutate({})} saving={save.isPending}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Bloquear após X tentativas falhas</Label><Input type="number" min={0} value={state.bloquear_apos_tentativas} onChange={(e) => setState({ ...state, bloquear_apos_tentativas: Number(e.target.value) })} /></div>
        <div><Label>Encerrar sessão inativa após (min)</Label><Input type="number" min={0} value={state.encerrar_sessao_min} onChange={(e) => setState({ ...state, encerrar_sessao_min: Number(e.target.value) })} /></div>
      </div>
      <div className="space-y-2">
        {[
          ["exigir_senha_forte", "Exigir senha forte (mínimo 8 caracteres, letras e números)"],
          ["exigir_2fa_admin", "Exigir 2FA para administradores"],
          ["log_acessos", "Registrar acessos em auditoria"],
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
