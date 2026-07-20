import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/notificacoes")({
  component: () => (
    <ComingSoon
      title="Notificações"
      desc="A central de alertas e canais de notificação (e-mail, WhatsApp, push) está sendo preparada."
    />
  ),
});
