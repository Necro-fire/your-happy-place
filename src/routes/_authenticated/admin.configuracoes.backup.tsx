import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/backup")({
  component: () => (
    <ComingSoon
      title="Dados e Backup"
      desc="Exportações completas, histórico de versões e restauração automática estarão disponíveis em breve."
    />
  ),
});
