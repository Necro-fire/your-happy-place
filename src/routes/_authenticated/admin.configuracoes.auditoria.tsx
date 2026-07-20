import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/auditoria")({
  component: AuditPage,
});

function AuditPage() {
  const logs = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">Auditoria</h2>
      <p className="mt-1 text-sm text-muted-foreground">Histórico das últimas alterações registradas no sistema.</p>
      <div className="mt-4 space-y-2">
        {(logs.data ?? []).length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum registro de auditoria ainda.</p>
        )}
        {(logs.data ?? []).map((l: any) => (
          <div key={l.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{l.user_email ?? "Sistema"}</span>
                <Badge variant="outline">{l.acao}</Badge>
                <span className="text-xs text-muted-foreground">{l.entidade}{l.entidade_id ? ` #${l.entidade_id}` : ""}</span>
              </div>
              {Object.keys(l.detalhes ?? {}).length > 0 && (
                <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2 text-xs text-muted-foreground">{JSON.stringify(l.detalhes, null, 2)}</pre>
              )}
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(l.created_at)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
