import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setMesaSession } from "@/lib/mesa-session";
import { useTenant, loadTenantByCodigo } from "@/lib/tenant-session";
import { PublicLayout } from "@/components/public/PublicLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, BookOpen, ListOrdered } from "lucide-react";

export const Route = createFileRoute("/mesa/$numero")({
  head: ({ params }) => ({ meta: [{ title: `Mesa ${params.numero}` }] }),
  component: MesaEntryPage,
});

function MesaEntryPage() {
  const { numero } = Route.useParams();
  const navigate = useNavigate();
  const tenant = useTenant();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const menuTo = tenant?.codigo ? `/menu/${tenant.codigo}` : "/";

  useEffect(() => {
    (async () => {
      // Auto-load tenant from ?c=CODIGO if present and not yet loaded
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const c = params.get("c");
      let currentTenant = tenant;
      if (c && (!currentTenant || currentTenant.codigo !== c.toUpperCase())) {
        currentTenant = await loadTenantByCodigo(c);
      }
      if (!currentTenant?.tenant_id) {
        setError("Abra o cardápio da loja primeiro para identificar sua mesa.");
        return;
      }
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, numero")
        .eq("numero", Number(numero))
        .eq("tenant_id" as any, currentTenant.tenant_id)
        .maybeSingle();
      if (error || !data) {
        setError("Mesa não encontrada. Chame um atendente.");
        return;
      }
      setMesaSession({ mesa_id: data.id, numero: data.numero });
      setReady(true);
    })();
  }, [numero, tenant?.tenant_id]);

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Coffee className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Mesa {numero}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? (ready ? "O que você gostaria de fazer?" : "Identificando sua mesa...")}
        </p>

        {ready && !error && (
          <Card className="mt-6 w-full space-y-2 p-4">
            <Button className="w-full" onClick={() => navigate({ to: menuTo, replace: true })}>
              <BookOpen className="mr-2 h-4 w-4" /> Ver cardápio
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link to="/mesa/$numero/pedidos" params={{ numero }}>
                <ListOrdered className="mr-2 h-4 w-4" /> Meus pedidos
              </Link>
            </Button>
          </Card>
        )}

        {error && !tenant?.tenant_id && (
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>Ir para início</Button>
        )}
      </div>
    </PublicLayout>
  );
}
