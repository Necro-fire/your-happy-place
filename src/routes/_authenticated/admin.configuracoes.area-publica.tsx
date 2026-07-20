import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/area-publica")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Área Pública</h2>
      <p className="mt-1 text-sm text-muted-foreground">O cardápio digital fica disponível na página inicial do seu estabelecimento.</p>
      <div className="mt-4">
        <Button asChild><a href="/" target="_blank" rel="noreferrer">Abrir cardápio público <ExternalLink className="ml-1 h-4 w-4" /></a></Button>
      </div>
    </Card>
  ),
});
