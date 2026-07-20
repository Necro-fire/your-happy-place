import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Coffee, Plus, Trash2, Pencil, ShoppingCart, PlayCircle, ArrowRight, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";

export const Route = createFileRoute("/_authenticated/admin/mesas")({
  component: MesasPage,
});

type MesaStatus = "livre" | "em_atendimento" | "fechamento_pendente";

const STATUS_META: Record<MesaStatus, { label: string; dot: string; card: string; badge: string }> = {
  livre: {
    label: "Livre",
    dot: "bg-emerald-500",
    card: "border-emerald-500/40 bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  em_atendimento: {
    label: "Em atendimento",
    dot: "bg-amber-500",
    card: "border-amber-500/50 bg-amber-500/10",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  fechamento_pendente: {
    label: "Fechamento pendente",
    dot: "bg-rose-500",
    card: "border-rose-500/50 bg-rose-500/10",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
};

function tempoOcupacao(desde?: string | null) {
  if (!desde) return null;
  const ms = Date.now() - new Date(desde).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "há instantes";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return `${h}h${r.toString().padStart(2, "0")}`;
}

function computeStatus(order: any | undefined): MesaStatus {
  if (!order) return "livre";
  if (order.status === "pronto") return "fechamento_pendente";
  return "em_atendimento";
}

function MesasPage() {
  const qc = useQueryClient();
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: async () =>
      (await supabase.from("restaurant_tables").select("*").order("numero")).data ?? [],
  });

  const openOrders = useQuery({
    queryKey: ["mesa-open-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, numero, mesa_id, status, total, subtotal, created_at, garcom_id, cliente_nome, observacoes, order_items(id, produto_nome, quantidade, preco_unitario, subtotal, observacoes, complementos)")
        .eq("origem", "mesa")
        .not("status", "in", "(finalizado,cancelado)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("mesas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, () =>
        qc.invalidateQueries({ queryKey: ["tables"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        qc.invalidateQueries({ queryKey: ["mesa-open-orders"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () =>
        qc.invalidateQueries({ queryKey: ["mesa-open-orders"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const orderByMesa = useMemo(() => {
    const m: Record<string, any> = {};
    (openOrders.data ?? []).forEach((o) => {
      if (o.mesa_id && !m[o.mesa_id]) m[o.mesa_id] = o;
    });
    return m;
  }, [openOrders.data]);

  const rows = useMemo(
    () =>
      (tables.data ?? []).map((m) => {
        const order = orderByMesa[m.id];
        const status = computeStatus(order);
        return { mesa: m, order, status };
      }),
    [tables.data, orderByMesa],
  );

  const counts = useMemo(() => {
    const total = rows.length;
    let livre = 0, em = 0, fech = 0;
    for (const r of rows) {
      if (r.status === "livre") livre++;
      else if (r.status === "em_atendimento") em++;
      else fech++;
    }
    return { total, livre, em, fech };
  }, [rows]);

  const removeTable = useMutation({
    mutationFn: async (id: string) => {
      const has = (openOrders.data ?? []).some((o) => o.mesa_id === id);
      if (has) throw new Error("Não é possível excluir uma mesa com pedido aberto.");
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mesa excluída");
      qc.invalidateQueries({ queryKey: ["tables"] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Mesas</h1>
          <p className="text-sm text-muted-foreground">
            Status das mesas em tempo real — integrado ao PDV.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar mesa
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Total de mesas" value={counts.total} dot="bg-primary" />
        <StatCard label="Livres" value={counts.livre} dot="bg-emerald-500" />
        <StatCard label="Em atendimento" value={counts.em} dot="bg-amber-500" />
        <StatCard label="Aguardando fechamento" value={counts.fech} dot="bg-rose-500" />
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma mesa cadastrada. Clique em <strong>Adicionar mesa</strong> para começar.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {rows.map(({ mesa, order, status }) => {
            const meta = STATUS_META[status];
            const tempo = tempoOcupacao(order?.created_at);
            return (
              <button
                key={mesa.id}
                type="button"
                onClick={() => setSelected({ mesa, order, status })}
                className={`group flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition hover:shadow-md ${meta.card}`}
              >
                <div className="flex w-full items-start justify-between">
                  <Coffee className="h-5 w-5 opacity-70" />
                  <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                </div>
                <div className="font-display text-2xl font-bold leading-none">
                  Mesa {mesa.numero}
                </div>
                <div className="text-xs font-medium">{meta.label}</div>
                {order && (
                  <>
                    <div className="text-xs text-muted-foreground">Pedido #{order.numero}</div>
                    <div className="text-sm font-semibold">{fmtMoney(order.total)}</div>
                    {tempo && <div className="text-[11px] text-muted-foreground">⏱ {tempo}</div>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <MesaFormDialog
          onClose={() => setCreating(false)}
          nextNumero={Math.max(0, ...rows.map((r) => r.mesa.numero)) + 1}
        />
      )}
      {editing && <MesaFormDialog mesa={editing} onClose={() => setEditing(null)} />}
      {selected && (
        <MesaDetailDialog
          data={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected.mesa);
            setSelected(null);
          }}
          onDelete={() => removeTable.mutate(selected.mesa.id)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </Card>
  );
}

function MesaFormDialog({
  mesa,
  nextNumero,
  onClose,
}: {
  mesa?: any;
  nextNumero?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [numero, setNumero] = useState<string>(String(mesa?.numero ?? nextNumero ?? 1));
  const [observacoes, setObservacoes] = useState<string>(mesa?.observacoes ?? "");
  const [capacidade, setCapacidade] = useState<string>(String(mesa?.capacidade ?? 4));

  const save = useMutation({
    mutationFn: async () => {
      const num = Number(numero);
      if (!num || num < 1) throw new Error("Informe um número válido.");
      const payload: any = {
        numero: num,
        capacidade: Math.max(1, Number(capacidade) || 1),
        observacoes: observacoes || null,
      };
      if (mesa) {
        const { error } = await supabase.from("restaurant_tables").update(payload).eq("id", mesa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("restaurant_tables").insert({ ...payload, status: "livre" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(mesa ? "Mesa atualizada" : "Mesa adicionada");
      qc.invalidateQueries({ queryKey: ["tables"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mesa ? `Editar mesa ${mesa.numero}` : "Nova mesa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Número da mesa *</Label>
            <Input type="number" min={1} value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <Label>Capacidade (lugares)</Label>
            <Input type="number" min={1} value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: mesa da varanda, próxima da janela..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {mesa ? "Salvar alterações" : "Adicionar mesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MesaDetailDialog({
  data,
  onClose,
  onEdit,
  onDelete,
}: {
  data: { mesa: any; order: any | undefined; status: MesaStatus };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { mesa, order, status } = data;
  const navigate = useNavigate();
  const meta = STATUS_META[status];
  const tempo = tempoOcupacao(order?.created_at);

  const responsavel = useQuery({
    queryKey: ["mesa-garcom", order?.garcom_id],
    enabled: !!order?.garcom_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome, email")
        .eq("id", order.garcom_id)
        .maybeSingle();
      return data;
    },
  });

  function novoPedido() {
    navigate({ to: "/admin/pdv", search: { mesa: mesa.id } as any });
  }

  function continuarPedido() {
    if (!order) return;
    navigate({ to: "/admin/pdv", search: { mesa: mesa.id, order: order.id } as any });
  }

  const items = (order?.order_items ?? []) as any[];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Mesa {mesa.numero}
            <span className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
              <CircleDot className="h-3 w-3" /> {meta.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
            <Info label="Capacidade" value={`${mesa.capacidade ?? "—"} lugares`} />
            <Info
              label="Aberta em"
              value={order?.created_at ? fmtDate(order.created_at) : "—"}
            />
            <Info label="Tempo de ocupação" value={tempo ?? "—"} />
            <Info
              label="Responsável"
              value={responsavel.data?.nome ?? (order?.cliente_nome ?? "—")}
            />
          </div>

          {mesa.observacoes && (
            <div className="rounded-lg border bg-card p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground">Observações da mesa</div>
              <div>{mesa.observacoes}</div>
            </div>
          )}
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Pedido atual</h3>
            {order && (
              <span className="text-xs text-muted-foreground">
                #{order.numero} · {items.length} item(s)
              </span>
            )}
          </div>
          {!order ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum pedido aberto.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              O pedido está aberto mas ainda não possui itens.
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {items.map((it: any) => (
                <div key={it.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {it.quantidade}x {it.produto_nome}
                    </div>
                    {Array.isArray(it.complementos) && it.complementos.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        + {it.complementos.map((c: any) => c.nome).join(", ")}
                      </div>
                    )}
                    {it.observacoes && (
                      <div className="text-xs text-muted-foreground">📝 {it.observacoes}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">{fmtMoney(it.preco_unitario)} un.</div>
                    <div className="font-semibold">{fmtMoney(it.subtotal)}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 text-sm">
                <span className="text-muted-foreground">Total parcial</span>
                <span className="font-display text-lg font-bold text-primary">
                  {fmtMoney(order.total)}
                </span>
              </div>
            </div>
          )}
        </section>

        <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (order) {
                  toast.error("Não é possível excluir uma mesa com pedido aberto.");
                  return;
                }
                if (await dialog.confirm({ title: `Excluir mesa ${mesa.numero}?`, destructive: true, confirmText: "Excluir" })) onDelete();
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
          <div className="flex gap-2">
            {order ? (
              <Button onClick={continuarPedido}>
                <PlayCircle className="mr-1 h-4 w-4" /> Continuar atendimento no PDV
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={novoPedido}>
                <ShoppingCart className="mr-1 h-4 w-4" /> Novo pedido no PDV
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}
