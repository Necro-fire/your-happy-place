import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/filiais")({
  component: FiliaisPage,
});

function FiliaisPage() {
  const q = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => (await supabase.from("filiais").select("*").order("nome")).data ?? [],
  });
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">Filiais</h2>
      <p className="mt-1 text-sm text-muted-foreground">Unidades do estabelecimento cadastradas.</p>
      <div className="mt-4 space-y-2">
        {(q.data ?? []).length === 0 && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma filial cadastrada.</p>}
        {(q.data ?? []).map((f: any) => (
          <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{f.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{f.endereco ?? "—"}</div>
            </div>
            <Badge variant={f.ativa ? "default" : "outline"}>{f.ativa ? "Ativa" : "Inativa"}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
