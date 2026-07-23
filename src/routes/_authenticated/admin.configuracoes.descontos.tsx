import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/descontos")({
  component: () => (
    <ComingSoon
      title="Descontos"
      desc="Regras, limites e permissões para aplicação de descontos estarão disponíveis em breve."
    />
  ),
});
