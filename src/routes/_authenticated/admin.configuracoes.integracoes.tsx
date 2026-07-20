import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/integracoes")({
  component: () => (
    <ComingSoon
      title="Integrações"
      desc="Conexões com WhatsApp, webhooks e plataformas externas estarão disponíveis em breve."
    />
  ),
});
