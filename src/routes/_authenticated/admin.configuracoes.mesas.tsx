import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/mesas")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Mesas</h2>
      <p className="mt-1 text-sm text-muted-foreground">Crie mesas, organize setores, defina capacidade e gere QR Codes para atendimento presencial.</p>
      <div className="mt-4">
        <Button asChild><Link to="/admin/mesas">Abrir gestão de mesas <ExternalLink className="ml-1 h-4 w-4" /></Link></Button>
      </div>
    </Card>
  ),
});
