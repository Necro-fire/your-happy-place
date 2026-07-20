import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/sistema")({
  component: () => (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Info className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Sistema</h2>
          <p className="text-sm text-muted-foreground">Informações da versão em uso.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info2 label="Versão" value="1.0.0" />
            <Info2 label="Plano" value={<Badge>Profissional</Badge>} />
            <Info2 label="Status" value={<Badge className="bg-success text-success-foreground">Ativo</Badge>} />
            <Info2 label="Suporte" value="Central de Suporte no menu lateral" />
          </div>
          <p className="mt-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Suporte, atualizações, licenças e integrações globais são gerenciados pelo desenvolvedor do sistema.
          </p>
        </div>
      </div>
    </Card>
  ),
});

function Info2({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
