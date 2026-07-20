import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/estoque")({
  component: () => (
    <ComingSoon
      title="Estoque"
      desc="As configurações avançadas de estoque (mínimo, alertas, regras de venda) estarão disponíveis em breve. Enquanto isso, use o módulo Estoque em Operações para movimentações."
    />
  ),
});
