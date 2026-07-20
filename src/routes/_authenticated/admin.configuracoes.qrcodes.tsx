import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/qrcodes")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">QR Codes</h2>
      <p className="mt-1 text-sm text-muted-foreground">Gere e imprima QR Codes das mesas e do cardápio digital. Os QR Codes das mesas são permanentes e reutilizáveis.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild><Link to="/admin/mesas">QR Codes das mesas <ExternalLink className="ml-1 h-4 w-4" /></Link></Button>
        <Button variant="outline" asChild><a href="/" target="_blank" rel="noreferrer">Link do cardápio <ExternalLink className="ml-1 h-4 w-4" /></a></Button>
      </div>
    </Card>
  ),
});
