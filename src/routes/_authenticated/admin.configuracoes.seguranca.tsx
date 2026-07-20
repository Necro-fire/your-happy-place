import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/seguranca")({
  component: () => (
    <ComingSoon
      title="Segurança"
      desc="Gestão de sessões, políticas de senha e auditoria de acesso estarão disponíveis em breve."
    />
  ),
});
