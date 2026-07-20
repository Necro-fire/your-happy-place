import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/produtos")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Produtos</h2>
      <p className="mt-1 text-sm text-muted-foreground">Gerencie o catálogo completo: categorias, complementos, combos e disponibilidade.</p>
      <ul className="mt-4 grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
        <li>Categorias e subcategorias</li>
        <li>Adicionais, complementos e combos</li>
        <li>Tamanhos, sabores e unidades de medida</li>
        <li>Controle de estoque e validade</li>
      </ul>
      <div className="mt-4">
        <Button asChild><Link to="/admin/catalogo">Abrir catálogo <ExternalLink className="ml-1 h-4 w-4" /></Link></Button>
      </div>
    </Card>
  ),
});
