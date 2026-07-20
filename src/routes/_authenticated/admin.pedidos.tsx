import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fmtMoney, fmtTime, fmtDate, statusLabel, statusColor,
  paymentLabel, tipoLabel, tipoColor, tipoDot, origemLabel,
} from "@/lib/format";
import { Printer, Truck, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { FiltersDrawer, FilterChips } from "@/components/filters/FiltersDrawer";
import { useFilters } from "@/components/filters/useFilters";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: PedidosPage,
});

const PED_CATEGORIES = [
  { value: "local", label: "Mesa" },
  { value: "entrega", label: "Entrega" },
  { value: "retirada", label: "Retirada" },
];
const PED_STATUS = [
  { value: "novo", label: "Novo" },
  { value: "em_preparo", label: "Em preparo" },
  { value: "pronto", label: "Pronto" },
  { value: "saiu_entrega", label: "Em rota" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
];

const COLUMNS: Array<{ key: string; label: string; icon?: any; tone?: string }> = [
  { key: "novo", label: "Novos Pedidos" },
  { key: "em_preparo", label: "Em Produção" },
  { key: "pronto", label: "Prontos" },
  { key: "saiu_entrega", label: "Em Rota de Entrega", icon: Truck, tone: "bg-chart-4/10 border-chart-4/40" },
  { key: "entregue", label: "Pedido Entregue" },
];

function PedidosPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<any | null>(null);
  const f = useFilters("pedidos", { sort: "recent" });
  const { state, setState, reset, activeChips, dateRange, presets, savePreset, applyPreset, removePreset } = f;

  const orders = useQuery({
    queryKey: ["admin-orders-active"],
    queryFn: async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .or(`status.in.(novo,confirmado,em_preparo,pronto,saiu_entrega),and(status.eq.entregue,created_at.gte.${since.toISOString()})`)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["admin-orders-active"] });
        if (payload.eventType === "INSERT") toast.success(`Novo pedido #${(payload.new as any).numero}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, motivo }: { id: string; status: string; motivo?: string }) => {
      const patch: any = { status };
      if (status === "entregue" || status === "finalizado") patch.finalizado_em = new Date().toISOString();
      if (status === "cancelado") { patch.cancelado_em = new Date().toISOString(); if (motivo) patch.motivo_cancelamento = motivo; }
      await supabase.from("orders").update(patch).eq("id", id);
      if (status === "cancelado") {
        // Remove qualquer entrada do caixa vinculada a esse pedido
        await supabase.from("cash_movements").delete().eq("order_id", id);
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const filtered = useMemo(() => {
    let list = orders.data ?? [];
    if (state.categories.length > 0) list = list.filter((o) => state.categories.includes(o.tipo));
    if (state.status.length > 0) list = list.filter((o) => state.status.includes(o.status));
    if (dateRange.start) list = list.filter((o) => new Date(o.created_at) >= dateRange.start!);
    if (dateRange.end) list = list.filter((o) => new Date(o.created_at) <= dateRange.end!);
    if (state.valueMin != null) list = list.filter((o) => Number(o.total) >= state.valueMin!);
    if (state.valueMax != null) list = list.filter((o) => Number(o.total) <= state.valueMax!);
    if (state.q.trim()) {
      const s = state.q.toLowerCase();
      list = list.filter((o) =>
        String(o.numero).includes(s) ||
        (o.cliente_nome ?? "").toLowerCase().includes(s) ||
        (o.cliente_telefone ?? "").includes(s),
      );
    }
    return list;
  }, [orders.data, state, dateRange.start, dateRange.end]);

  const byStatus = (k: string) => {
    if (k === "em_preparo") return filtered.filter((o) => o.status === "em_preparo" || o.status === "confirmado");
    if (k === "saiu_entrega") return filtered.filter((o) => o.status === "saiu_entrega");
    return filtered.filter((o) => o.status === k);
  };

  const nextStatus = (colKey: string, o: any): { status: string; label: string } | null => {
    if (colKey === "novo") return { status: "em_preparo", label: "Iniciar produção" };
    if (colKey === "em_preparo") return { status: "pronto", label: "Marcar pronto" };
    if (colKey === "pronto") {
      return o.tipo === "entrega"
        ? { status: "saiu_entrega", label: "Enviar para entrega" }
        : { status: "entregue", label: "Marcar entregue" };
    }
    if (colKey === "saiu_entrega") return { status: "entregue", label: "Confirmar entrega" };
    return null;
  };

  const prevStatus = (o: any): { status: string; label: string } | null => {
    switch (o.status) {
      case "em_preparo": return { status: "novo", label: "Novo" };
      case "pronto": return { status: "em_preparo", label: "Em Produção" };
      case "saiu_entrega": return { status: "pronto", label: "Pronto" };
      case "entregue":
        return o.tipo === "entrega"
          ? { status: "saiu_entrega", label: "Em Rota de Entrega" }
          : { status: "pronto", label: "Pronto" };
      case "finalizado": return { status: "pronto", label: "Pronto" };
      default: return null;
    }
  };

  const confirmarRetroceder = async (o: any, target: { status: string; label: string }) => {
    const ok = await dialog.confirm({
      title: "Retroceder pedido",
      description: `Tem certeza de que deseja retornar o pedido #${o.numero} para o status "${target.label}"?\n\nEssa ação atualizará o pedido para a etapa anterior.`,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
    });
    if (ok) updateStatus.mutate({ id: o.id, status: target.status });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Acompanhe e atualize o status em tempo real.</p>
        </div>
        <FiltersDrawer
          sections={{ search: true, period: true, status: PED_STATUS, categories: PED_CATEGORIES, valueRange: true }}
          state={state}
          setState={setState as any}
          reset={reset}
          presets={presets}
          onSavePreset={savePreset}
          onApplyPreset={applyPreset}
          onRemovePreset={removePreset}
          activeCount={activeChips.length}
        />
      </div>

      <FilterChips chips={activeChips} onClearAll={reset} />


      <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 pb-3 md:mx-0 md:px-0" style={{ scrollbarGutter: "stable" }}>
        <div className="flex gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const items = byStatus(col.key);
            return (
              <div key={col.key} className="flex w-[280px] shrink-0 flex-col gap-2 md:w-auto">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2 shadow-sm">
                  <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{col.label}</span>
                  </h3>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex min-h-[200px] flex-col gap-2 rounded-2xl border border-dashed border-border/50 bg-muted/20 p-2">
                  {items.map((o) => {
                    const next = nextStatus(col.key, o);
                    const prev = prevStatus(o);
                    return (
                      <div
                        key={o.id}
                        className={`cursor-pointer rounded-xl border border-border/60 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md border-l-4 ${tipoColor[o.tipo] ?? ""}`}
                        onClick={() => setDetail(o)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-bold">#{o.numero}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{fmtTime(o.created_at)} · {origemLabel[o.origem]}</div>
                          </div>
                          <div className="shrink-0 text-right text-sm font-bold text-primary">{fmtMoney(o.total)}</div>
                        </div>
                        <div className="mt-1 truncate text-xs font-medium">{o.cliente_nome ?? "Sem cliente"}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${tipoDot[o.tipo] ?? "bg-muted"}`} />
                          <span className="truncate font-medium text-muted-foreground">{tipoLabel[o.tipo]}</span>
                        </div>
                        <div className="mt-2 flex gap-1.5">
                          {prev && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs font-semibold"
                              title={`Retroceder para ${prev.label}`}
                              onClick={(e) => { e.stopPropagation(); confirmarRetroceder(o, prev); }}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {next && (
                            <Button size="sm" className="h-8 flex-1 rounded-lg text-xs font-semibold" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: o.id, status: next.status }); }}>
                              {next.label} →
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && <div className="py-8 text-center text-[11px] font-medium text-muted-foreground/70">vazio</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {detail && <OrderDetail order={detail} list={filtered} onNavigate={(o: any) => setDetail(o)} onClose={() => setDetail(null)} onUpdate={(s: string, motivo?: string) => updateStatus.mutate({ id: detail.id, status: s, motivo })} onRetrocede={(o: any) => { const p = prevStatus(o); if (p) confirmarRetroceder(o, p); }} />}
    </div>
  );
}

function OrderDetail({ order, list, onNavigate, onClose, onUpdate, onRetrocede }: any) {
  const idx = (list ?? []).findIndex((o: any) => o.id === order.id);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!prev} onClick={() => prev && onNavigate(prev)} title="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
            Pedido #{order.numero}
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!next} onClick={() => next && onNavigate(next)} title="Próximo"><ChevronRight className="h-4 w-4" /></Button>
            <Badge className={tipoColor[order.tipo]}>{tipoLabel[order.tipo]}</Badge>
            <Badge className={statusColor[order.status]}>{statusLabel[order.status]}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="print-area space-y-2 text-sm">
          <div className="text-center font-bold">PEDIDO #{order.numero}</div>
          <div>Categoria: {tipoLabel[order.tipo]}</div>
          <div>Cliente: {order.cliente_nome}</div>
          <div>Telefone: {order.cliente_telefone}</div>
          {order.tipo === "entrega" && (
            <>
              {order.cep && <div>CEP: {order.cep}</div>}
              {(order.rua || order.numero_endereco) && <div>Endereço: {[order.rua, order.numero_endereco].filter(Boolean).join(", ")}</div>}
              {order.complemento && <div>Complemento: {order.complemento}</div>}
              {order.bairro && <div>Bairro: {order.bairro}</div>}
              {(order.cidade || order.estado) && <div>{[order.cidade, order.estado].filter(Boolean).join(" / ")}</div>}
              {order.ponto_referencia && <div>Referência: {order.ponto_referencia}</div>}
            </>
          )}
          {order.tipo === "retirada" && order.horario_retirada && (
            <div>Retirada prevista: {fmtDate(order.horario_retirada)}</div>
          )}
          <div>Pagamento: {paymentLabel[order.forma_pagamento]}</div>
          <hr />
          {(order.order_items ?? []).map((it: any) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.quantidade}× {it.produto_nome}</span>
              <span>{fmtMoney(it.subtotal)}</span>
            </div>
          ))}
          <hr />
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(order.subtotal)}</span></div>
          {Number(order.taxa_entrega) > 0 && <div className="flex justify-between"><span>Taxa</span><span>{fmtMoney(order.taxa_entrega)}</span></div>}
          <div className="flex justify-between font-bold"><span>Total</span><span>{fmtMoney(order.total)}</span></div>
          {order.observacoes && <div className="border-t pt-2 italic">Obs: {order.observacoes}</div>}
        </div>
        <div className="no-print flex flex-wrap gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button>
          {onRetrocede && !["novo", "cancelado"].includes(order.status) && (
            <Button size="sm" variant="outline" onClick={() => onRetrocede(order)}>
              <Undo2 className="h-4 w-4" />Voltar etapa
            </Button>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={async () => {
            const motivo = await dialog.prompt({ title: "Cancelar pedido", description: "Informe o motivo do cancelamento:", placeholder: "Ex: cliente desistiu", confirmText: "Cancelar pedido", cancelText: "Voltar" });
            if (motivo !== null) { onUpdate("cancelado", motivo || "Sem motivo informado"); onClose(); }
          }}>Cancelar</Button>
          <Button size="sm" onClick={() => { onUpdate("entregue"); onClose(); }}>Marcar entregue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
