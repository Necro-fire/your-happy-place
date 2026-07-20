import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/public/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtMoney, statusLabel, statusColor } from "@/lib/format";
import { Coffee, Clock, RefreshCw } from "lucide-react";
import { useTenant, publicMenuHref } from "@/lib/tenant-session";

export const Route = createFileRoute("/mesa/$numero/pedidos")({
  head: ({ params }) => ({ meta: [{ title: `Mesa ${params.numero} — Meus pedidos` }] }),
  component: MesaPedidosPage,
});

function MesaPedidosPage() {
  const { numero } = Route.useParams();
  const tenant = useTenant();
  const menuTo = publicMenuHref(tenant);


  const mesa = useQuery({
    queryKey: ["mesa-lookup", numero, tenant?.tenant_id],
    enabled: !!tenant?.tenant_id,
    queryFn: async () => (await supabase.from("restaurant_tables").select("id, numero").eq("numero", Number(numero)).eq("tenant_id" as any, tenant!.tenant_id).maybeSingle()).data,
  });

  const orders = useQuery({
    queryKey: ["mesa-orders-public", mesa.data?.id],
    enabled: !!mesa.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("mesa_id", mesa.data!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!mesa.data?.id) return;
    const ch = supabase
      .channel(`mesa-${mesa.data.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `mesa_id=eq.${mesa.data.id}` }, () => orders.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => orders.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mesa.data?.id, orders]);

  if (mesa.isLoading) return <PublicLayout><div className="py-20 text-center">Carregando...</div></PublicLayout>;
  if (!mesa.data) return <PublicLayout><div className="py-20 text-center">Mesa não encontrada.</div></PublicLayout>;

  const list = orders.data ?? [];
  const abertos = list.filter((o) => !["finalizado", "cancelado"].includes(o.status));
  const total = abertos.reduce((s, o) => s + Number(o.total), 0);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Coffee className="h-5 w-5" /></div>
            <div>
              <h1 className="font-display text-xl font-bold">Mesa {mesa.data.numero}</h1>
              <p className="text-xs text-muted-foreground">Atualização automática</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => orders.refetch()}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {abertos.length > 0 && (
          <Card className="mb-3 flex items-center justify-between bg-primary/5 p-4">
            <span className="text-sm text-muted-foreground">Consumo em aberto</span>
            <span className="font-display text-xl font-bold text-primary">{fmtMoney(total)}</span>
          </Card>
        )}

        {list.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum pedido nesta mesa ainda.</p>
            <Button asChild className="mt-4"><Link to={menuTo as any}>Abrir cardápio</Link></Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((o: any) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-base font-bold">Pedido #{o.numero}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <Badge className={statusColor[o.status]}>{statusLabel[o.status]}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {(o.order_items ?? []).map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={it.status === "entregue" ? "text-success" : ""}>
                          {it.quantidade}× {it.produto_nome}
                        </span>
                        {it.status && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                            {it.status === "entregue" ? "Entregue" : it.status === "pronto" ? "Pronto" : it.status === "preparando" ? "Em preparo" : "Pendente"}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground">{fmtMoney(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t pt-2 text-sm font-semibold">
                  <span>Total</span><span className="text-primary">{fmtMoney(o.total)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button asChild variant="outline" className="mt-6 w-full"><Link to={menuTo as any}>Ver cardápio</Link></Button>
      </div>
    </PublicLayout>
  );
}
