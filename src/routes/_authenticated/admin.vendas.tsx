import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, fmtDate, statusLabel, statusColor, paymentLabel, origemLabel, tipoLabel, tipoColor, fmtPhone } from "@/lib/format";
import { smartFilter } from "@/lib/search";
import { FiltersDrawer, FilterChips } from "@/components/filters/FiltersDrawer";
import { useFilters } from "@/components/filters/useFilters";

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
                <tr key={o.id} className="hover:bg-accent/20">
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
    </div>
  );
}
