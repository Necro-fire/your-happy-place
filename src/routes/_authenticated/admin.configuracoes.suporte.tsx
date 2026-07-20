import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { LifeBuoy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/suporte")({
  component: SuporteShortcut,
});

function SuporteShortcut() {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Suporte</h2>
          <p className="text-sm text-muted-foreground">
            Central de ajuda, categorias, soluções e histórico de atendimentos.
          </p>
          <Link
            to="/admin/suporte"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Abrir central de suporte <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
