import { createFileRoute } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { ComingSoonPage } from "@/components/admin/ComingSoonPage";

export const Route = createFileRoute("/_authenticated/admin/qrcodes")({
  component: QrCodesComingSoon,
});

function QrCodesComingSoon() {
  return (
    <ComingSoonPage
      title="QR Codes"
      icon={QrCode}
      description="Um gerenciador completo de QR Codes para mesas, comandas, promoções e materiais impressos — com personalização visual, rastreamento de acessos e geração em lote."
      features={[
        "Geração de QR Codes para mesas e comandas",
        "QR Codes promocionais com links personalizados",
        "Personalização visual (cores e logo)",
        "Exportação em alta resolução (PNG e PDF)",
        "Impressão em lote com layouts prontos",
        "Estatísticas de acessos por QR Code",
      ]}
    />
  );
}
