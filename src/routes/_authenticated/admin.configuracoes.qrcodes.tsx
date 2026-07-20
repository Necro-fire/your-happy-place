import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, QrCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/qrcodes")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2"><QrCode className="h-5 w-5" /> QR Codes</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dois QR Codes oficiais: <strong>Cardápio</strong> (consulta pública do menu) e <strong>Mesa</strong> (acompanhamento em tempo real dos pedidos daquela mesa). Alterações são refletidas automaticamente — não é preciso gerar novo QR.
      </p>
      <div className="mt-4">
        <Button asChild><Link to="/admin/qrcodes">Abrir central de QR Codes <ExternalLink className="ml-1 h-4 w-4" /></Link></Button>
      </div>
    </Card>
  ),
});
