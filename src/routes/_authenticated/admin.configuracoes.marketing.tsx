import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";
export const Route = createFileRoute("/_authenticated/admin/configuracoes/marketing")({
  component: () => <ComingSoon title="Marketing" desc="Campanhas, mensagens automáticas e cupons promocionais." />,
});
