import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";
export const Route = createFileRoute("/_authenticated/admin/configuracoes/financeiro")({
  component: () => <ComingSoon title="Financeiro" desc="Categorias de receitas/despesas, formas de pagamento e regras de conciliação." />,
});
