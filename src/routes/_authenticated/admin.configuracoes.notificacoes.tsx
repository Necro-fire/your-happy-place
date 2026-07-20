import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { useSettingsConfig, SectionShell } from "@/components/admin/settings/useSettingsConfig";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/notificacoes")({
  component: NotifSettings,
});

function NotifSettings() {
  const { state, setState, save, loading } = useSettingsConfig("notificacoes", {
    novo_pedido_som: true,
    novo_pedido_toast: true,
    alerta_estoque: true,
    fechamento_caixa: true,
    email_ativo: false,
    whatsapp_ativo: false,
  });
  if (loading || !state) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <SectionShell title="Notificações" desc="Alertas dentro do sistema e canais de comunicação." onSave={() => save.mutate({})} saving={save.isPending}>
      <div className="space-y-2">
        {[
          ["novo_pedido_som", "Tocar som ao receber novo pedido"],
          ["novo_pedido_toast", "Mostrar toast de novo pedido"],
          ["alerta_estoque", "Alertar quando estoque atingir mínimo"],
          ["fechamento_caixa", "Lembrar fechamento de caixa"],
          ["email_ativo", "Enviar notificações por e-mail"],
          ["whatsapp_ativo", "Enviar notificações por WhatsApp"],
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
