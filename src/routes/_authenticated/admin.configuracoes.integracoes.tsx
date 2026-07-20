import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/integracoes")({
  component: IntegracoesSettings,
});

const DEFAULTS = {
  impressora_ativa: false,
  impressora_nome: "",
  whatsapp_suporte: "",
  webhook_url: "",
};

function IntegracoesSettings() {
  const { state, setState, save, loading } = useSettingsConfig("integracoes", DEFAULTS);
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell
      title="Integrações"
      desc="Conexões externas do sistema."
      onSave={() => save.mutate({})}
      saving={save.isPending}
    >
      <label className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <div className="text-sm font-medium">Impressora térmica</div>
          <div className="text-xs text-muted-foreground">Habilita comandos de impressão automática.</div>
        </div>
        <Switch checked={state.impressora_ativa} onCheckedChange={(v) => setState({ ...state, impressora_ativa: v })} />
      </label>
      <div>
        <Label>Nome/identificador da impressora</Label>
        <Input value={state.impressora_nome} onChange={(e) => setState({ ...state, impressora_nome: e.target.value })} />
      </div>
      <div>
        <Label>WhatsApp de suporte</Label>
        <Input
          placeholder="+55 11 99999-9999"
          value={state.whatsapp_suporte}
          onChange={(e) => setState({ ...state, whatsapp_suporte: e.target.value })}
        />
      </div>
      <div>
        <Label>Webhook (sistema externo)</Label>
        <Input
          placeholder="https://..."
          value={state.webhook_url}
          onChange={(e) => setState({ ...state, webhook_url: e.target.value })}
        />
      </div>
    </SectionShell>
  );
}
