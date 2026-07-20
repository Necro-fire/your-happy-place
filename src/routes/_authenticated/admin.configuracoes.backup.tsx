import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/backup")({
  component: BackupPage,
});

async function exportTable(name: string) {
  try {
    const { data, error } = await supabase.from(name as any).select("*").limit(10000);
    if (error) throw error;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Backup de ${name} gerado`);
  } catch (e: any) { toast.error(e.message); }
}

function BackupPage() {
  const tables = ["products", "categories", "orders", "customers", "clients", "restaurant_tables"];
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Database className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Backup</h2>
          <p className="text-sm text-muted-foreground">Exporte cópias dos seus dados. O backup automático completo é feito pelo desenvolvedor do sistema.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {tables.map((t) => (
              <Button key={t} variant="outline" onClick={() => exportTable(t)}>
                <Download className="mr-2 h-4 w-4" /> Exportar {t}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
