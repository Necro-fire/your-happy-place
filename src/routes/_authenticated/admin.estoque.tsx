import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { ComingSoonPage } from "@/components/admin/ComingSoonPage";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  component: EstoqueComingSoon,
});

function EstoqueComingSoon() {
  return (
    <ComingSoonPage
      title="Estoque"
      icon={Boxes}
      description="Um módulo completo para controlar entradas, saídas, perdas, inventários e níveis mínimos dos seus produtos, com alertas em tempo real e integração automática com as vendas."
      features={[
        "Controle de entradas e saídas de produtos",
        "Alertas automáticos de estoque mínimo",
        "Registro de perdas, quebras e ajustes",
        "Inventário assistido com contagem cíclica",
        "Baixa automática integrada ao PDV e Pedidos",
        "Relatórios e histórico completo de movimentações",
      ]}
    />
  );
}
