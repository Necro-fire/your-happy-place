import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtMoney, fmtDate, statusLabel, statusColor, paymentLabel, origemLabel, tipoLabel, tipoColor, fmtPhone } from "@/lib/format";
import { smartFilter } from "@/lib/search";
import { FiltersDrawer, FilterChips } from "@/components/filters/FiltersDrawer";
import { useFilters } from "@/components/filters/useFilters";
import { dialog } from "@/components/ui/app-dialog";
import { toast } from "sonner";
import { Trash2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  component: VendasPage,
});

const STATUS_OPTIONS = Object.entries(statusLabel).map(([value, label]) => ({ value, label }));
const CATEGORY_OPTIONS = [
  { value: "local", label: "Mesa" },
  { value: "entrega", label: "Entrega" },
  { value: "retirada", label: "Retirada" },
];
const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "old", label: "Mais antigos" },
  { value: "high", label: "Maior valor" },
  { value: "low", label: "Menor valor" },
];

function VendasPage() {
  const [detail, setDetail] = useState<any | null>(null);
  const f = useFilters("vendas", { sort: "recent" });
  const { state, setState, reset, activeChips, dateRange, presets, savePreset, applyPreset, removePreset } = f;

  const origem = (state.extras.origem as string) ?? "todos";
  const pgto = (state.extras.pgto as string) ?? "todos";

  const list = useQuery({
    queryKey: ["vendas", state.status, state.categories, origem, pgto, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (state.status.length === 1) q = q.eq("status", state.status[0] as any);
      else if (state.status.length > 1) q = q.in("status", state.status as any);
      if (state.categories.length === 1) q = q.eq("tipo", state.categories[0] as any);
      else if (state.categories.length > 1) q = q.in("tipo", state.categories as any);
      if (origem !== "todos") q = q.eq("origem", origem as any);
      if (pgto !== "todos") q = q.eq("forma_pagamento", pgto as any);
      if (dateRange.start) q = q.gte("created_at", dateRange.start.toISOString());
      if (dateRange.end) q = q.lte("created_at", dateRange.end.toISOString());
      const { data: rows } = await q;
      return rows ?? [];
    },
  });

  const filtered = useMemo(() => {
    let rows = smartFilter(list.data ?? [], state.q, [
      (o: any) => `#${o.numero}`,
      (o: any) => o.numero,
      (o: any) => o.cliente_nome,
      (o: any) => o.cliente_telefone,
    ]);
    if (state.valueMin != null) rows = rows.filter((o) => Number(o.total) >= state.valueMin!);
    if (state.valueMax != null) rows = rows.filter((o) => Number(o.total) <= state.valueMax!);
    switch (state.sort) {
      case "old": rows = [...rows].reverse(); break;
      case "high": rows = [...rows].sort((a, b) => Number(b.total) - Number(a.total)); break;
      case "low": rows = [...rows].sort((a, b) => Number(a.total) - Number(b.total)); break;
    }
    return rows;
  }, [list.data, state.q, state.valueMin, state.valueMax, state.sort]);

  const total = filtered.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} venda(s) — total {fmtMoney(total)}</p>
        </div>
        <FiltersDrawer
          sections={{
            search: true,
            period: true,
            status: STATUS_OPTIONS,
            categories: CATEGORY_OPTIONS,
            valueRange: true,
            sort: SORT_OPTIONS,
          }}
          state={state}
          setState={setState as any}
          reset={reset}
          presets={presets}
          onSavePreset={savePreset}
          onApplyPreset={applyPreset}
          onRemovePreset={removePreset}
          activeCount={activeChips.length}
          extras={
            <div className="grid gap-3">
              <div>
                <Label className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Origem</Label>
                <Select value={origem} onValueChange={(v) => setState((s) => ({ ...s, extras: { ...s.extras, origem: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as origens</SelectItem>
                    {Object.entries(origemLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Forma de pagamento</Label>
                <Select value={pgto} onValueChange={(v) => setState((s) => ({ ...s, extras: { ...s.extras, pgto: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {Object.entries(paymentLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />
      </div>

      <FilterChips chips={activeChips} onClearAll={reset} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Pgto</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => setDetail(o)} className="cursor-pointer hover:bg-accent/20">
                  <td className="px-3 py-2 font-mono font-semibold">#{o.numero}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDate(o.created_at)}</td>
                  <td className="px-3 py-2">{o.cliente_nome ?? "—"}{o.cliente_telefone ? <div className="text-xs text-muted-foreground">{fmtPhone(o.cliente_telefone)}</div> : null}</td>
                  <td className="px-3 py-2"><Badge className={tipoColor[o.tipo]}>{tipoLabel[o.tipo]}</Badge></td>
                  <td className="px-3 py-2">{origemLabel[o.origem]}</td>
                  <td className="px-3 py-2">{o.forma_pagamento ? paymentLabel[o.forma_pagamento] : "—"}</td>
                  <td className="px-3 py-2"><Badge className={statusColor[o.status]}>{statusLabel[o.status]}</Badge></td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(o.total)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma venda encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {detail && <VendaDetail orderId={detail.id} onClose={() => setDetail(null)} />}
    </div>
  );
}

function VendaDetail({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["venda-detail", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .maybeSingle();
      return data;
    },
  });

  const cancelSale = useMutation({
    mutationFn: async () => {
      const o = q.data;
      if (!o) throw new Error("Venda não encontrada");
      if (o.status === "cancelado") throw new Error("Venda já cancelada");
      const { error: uErr } = await supabase.from("orders").update({
        status: "cancelado", cancelado_em: new Date().toISOString(),
      }).eq("id", o.id);
      if (uErr) throw uErr;
      // Estorno no caixa: cria movimentação de saída equivalente
      const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
      if (session && Number(o.total) > 0) {
        await supabase.from("cash_movements").insert({
          session_id: session.id, tipo: "saida", valor: Number(o.total),
          descricao: `Estorno venda #${o.numero}`, forma_pagamento: o.forma_pagamento ?? "dinheiro",
          order_id: o.id,
        });
      }
    },
    onSuccess: () => { toast.success("Venda cancelada"); qc.invalidateQueries(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelItem = useMutation({
    mutationFn: async (item: any) => {
      const o = q.data;
      if (!o) throw new Error("Venda não encontrada");
      const valor = Number(item.subtotal);
      const { error: dErr } = await supabase.from("order_items").delete().eq("id", item.id);
      if (dErr) throw dErr;
      const novoSubtotal = Math.max(0, Number(o.subtotal) - valor);
      const novoTotal = Math.max(0, Number(o.total) - valor);
      await supabase.from("orders").update({ subtotal: novoSubtotal, total: novoTotal }).eq("id", o.id);
      const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
      if (session && valor > 0) {
        await supabase.from("cash_movements").insert({
          session_id: session.id, tipo: "saida", valor,
          descricao: `Cancelamento item — venda #${o.numero} (${item.produto_nome})`,
          forma_pagamento: o.forma_pagamento ?? "dinheiro",
          order_id: o.id,
        });
      }
    },
    onSuccess: () => { toast.success("Item cancelado"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const o = q.data;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Venda #{o?.numero}
            {o && <Badge className={statusColor[o.status]}>{statusLabel[o.status]}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {!o ? <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div> : (
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <div><span className="text-xs text-muted-foreground">Data</span><div className="font-medium">{fmtDate(o.created_at)}</div></div>
              <div><span className="text-xs text-muted-foreground">Pagamento</span><div className="font-medium">{o.forma_pagamento ? paymentLabel[o.forma_pagamento] : "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Cliente</span><div className="font-medium">{o.cliente_nome ?? "—"}{o.cliente_telefone ? ` · ${fmtPhone(o.cliente_telefone)}` : ""}</div></div>
              <div><span className="text-xs text-muted-foreground">Tipo</span><div className="font-medium">{tipoLabel[o.tipo]}</div></div>
            </div>

            <div className="rounded-lg border">
              <div className="border-b p-2 text-xs font-semibold text-muted-foreground">Itens</div>
              <div className="divide-y">
                {(o.order_items ?? []).map((it: any) => (
                  <div key={it.id} className="flex items-start justify-between gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{it.quantidade}× {it.produto_nome}</div>
                      <div className="text-xs text-muted-foreground">{fmtMoney(it.preco_unitario)} un.</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold">{fmtMoney(it.subtotal)}</div>
                      {o.status !== "cancelado" && (
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={async () => {
                          if (await dialog.confirm({ title: "Cancelar item?", description: `Remover "${it.produto_nome}" e ajustar caixa?`, destructive: true, confirmText: "Cancelar item" })) {
                            cancelItem.mutate(it);
                          }
                        }}><Trash2 className="mr-1 h-3 w-3" />Cancelar item</Button>
                      )}
                    </div>
                  </div>
                ))}
                {(o.order_items ?? []).length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">Sem itens</div>}
              </div>
              <div className="flex items-center justify-between border-t p-2 font-semibold">
                <span>Total</span><span className="text-primary">{fmtMoney(o.total)}</span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {o && o.status !== "cancelado" && (
            <Button variant="destructive" onClick={async () => {
              if (await dialog.confirm({ title: `Cancelar venda #${o.numero}?`, description: "A venda inteira será cancelada e o caixa ajustado.", destructive: true, confirmText: "Cancelar venda" })) {
                cancelSale.mutate();
              }
            }}><XCircle className="mr-1 h-4 w-4" />Cancelar venda</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
