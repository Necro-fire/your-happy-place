import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/financeiro")({
  component: () => (
    <ComingSoon
      title="Financeiro"
      desc="As configurações financeiras (moeda, formatação, categorias e regras contábeis) estarão disponíveis em breve."
    />
  ),
});
