import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtDate, fmtDateOnly, paymentLabel } from "@/lib/format";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock, Search, Download,
  Printer, RefreshCcw, TrendingUp, TrendingDown, ReceiptText, PlusCircle, MinusCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/caixa")({
  component: CaixaPage,
});

/* ---------- helpers ---------- */

const TIPO_LABEL: Record<string, string> = {
  venda: "Venda",
  entrada: "Entrada",
  saida: "Saída",
  sangria: "Sangria",
  suprimento: "Suprimento",
  reforco: "Reforço",
  estorno: "Estorno",
};

const TIPO_ENTRADA = new Set(["venda", "entrada", "suprimento", "reforco"]);
const TIPO_SAIDA = new Set(["saida", "sangria", "estorno"]);

const PAY_METHODS = ["dinheiro", "pix", "credito", "debito", "vale", "credito_cliente", "multiplo"] as const;

const csvEscape = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) { toast.info("Nada para exportar"); return; }
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(";")).join("\n");
  const blob = new Blob([`${headers.join(";")}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------- page ---------- */

function CaixaPage() {
  const qc = useQueryClient();
  const [openDlg, setOpenDlg] = useState<"open" | "close" | "mov" | null>(null);
  const [movType, setMovType] = useState<"entrada"|"saida"|"sangria"|"reforco"|"suprimento">("entrada");
  const [tab, setTab] = useState<"resumo" | "movimentacoes" | "pagamentos" | "historico">("resumo");

  // Filters
  const [search, setSearch] = useState("");
  const [fTipo, setFTipo] = useState<string>("todos");
  const [fForma, setFForma] = useState<string>("todos");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");
  const [fMin, setFMin] = useState<string>("");
  const [fMax, setFMax] = useState<string>("");

  const session = useQuery({
    queryKey: ["cash-session"],
    queryFn: async () => (await supabase.from("cash_sessions").select("*").eq("status", "aberta").maybeSingle()).data,
  });

  const movements = useQuery({
    queryKey: ["cash-movements", session.data?.id],
    enabled: !!session.data?.id,
    queryFn: async () =>
      (await supabase.from("cash_movements").select("*").eq("session_id", session.data!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const history = useQuery({
    queryKey: ["cash-sessions-history"],
    queryFn: async () =>
      (await supabase.from("cash_sessions").select("*").eq("status", "fechada").order("fechado_em", { ascending: false }).limit(30)).data ?? [],
  });

  const me = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("nome,email").eq("user_id", u.user.id).maybeSingle();
      return { id: u.user.id, ...(data ?? { nome: u.user.email, email: u.user.email }) };
    },
  });

  const rows = movements.data ?? [];

  // Aggregations for dashboard
  const agg = useMemo(() => {
    const a = {
      entradas: 0, saidas: 0,
      vendas: 0, recebimentos: 0, sangrias: 0, suprimentos: 0, reforcos: 0, estornos: 0,
      qtdVendas: 0, totalMovimentado: 0,
      byPay: Object.fromEntries(PAY_METHODS.map((p) => [p, 0])) as Record<string, number>,
    };
    for (const m of rows) {
      const v = Number(m.valor);
      a.totalMovimentado += v;
      if (TIPO_ENTRADA.has(m.tipo)) a.entradas += v;
      else if (TIPO_SAIDA.has(m.tipo)) a.saidas += v;
      if (m.tipo === "venda") { a.vendas += v; a.qtdVendas += 1; a.recebimentos += v; }
      if (m.tipo === "entrada") a.recebimentos += v;
      if (m.tipo === "sangria") a.sangrias += v;
      if (m.tipo === "suprimento") a.suprimentos += v;
      if (m.tipo === "reforco") a.reforcos += v;
      if (m.tipo === "estorno") a.estornos += v;
      if (m.forma_pagamento && a.byPay[m.forma_pagamento] != null) {
        a.byPay[m.forma_pagamento] += TIPO_ENTRADA.has(m.tipo) ? v : -v;
      }
    }
    return a;
  }, [rows]);

  const saldoInicial = session.data ? Number(session.data.saldo_inicial) : 0;
  const saldoAtual = session.data ? saldoInicial + agg.entradas - agg.saidas : 0;
  const ticketMedio = agg.qtdVendas > 0 ? agg.vendas / agg.qtdVendas : 0;

  // Filtered rows for movements tab
  const filtered = useMemo(() => {
    const from = fFrom ? new Date(fFrom).getTime() : null;
    const to = fTo ? new Date(fTo).getTime() + 86400000 : null;
    const min = fMin ? Number(fMin) : null;
    const max = fMax ? Number(fMax) : null;
    const q = search.trim().toLowerCase();
    return rows.filter((m) => {
      if (fTipo !== "todos" && m.tipo !== fTipo) return false;
      if (fForma !== "todos" && m.forma_pagamento !== fForma) return false;
      const t = new Date(m.created_at).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      const v = Number(m.valor);
      if (min != null && v < min) return false;
      if (max != null && v > max) return false;
      if (q && !(String(m.descricao ?? "").toLowerCase().includes(q) || String(m.id).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, fTipo, fForma, fFrom, fTo, fMin, fMax, search]);

  const clearFilters = () => { setSearch(""); setFTipo("todos"); setFForma("todos"); setFFrom(""); setFTo(""); setFMin(""); setFMax(""); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Caixa</h1>
          <p className="text-sm text-muted-foreground">
            {session.data
              ? <>Sessão aberta em <strong>{fmtDate(session.data.aberto_em)}</strong> · Operador: {me.data?.nome ?? "—"}</>
              : "Nenhuma sessão aberta"}
          </p>
        </div>
        {!session.data ? (
          <Button onClick={() => setOpenDlg("open")}><Unlock className="h-4 w-4" />Abrir caixa</Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { setMovType("entrada"); setOpenDlg("mov"); }}><ArrowDownCircle className="h-4 w-4" />Entrada</Button>
            <Button variant="outline" size="sm" onClick={() => { setMovType("saida"); setOpenDlg("mov"); }}><ArrowUpCircle className="h-4 w-4" />Saída</Button>
            <Button variant="outline" size="sm" onClick={() => { setMovType("sangria"); setOpenDlg("mov"); }}><MinusCircle className="h-4 w-4" />Sangria</Button>
            <Button variant="outline" size="sm" onClick={() => { setMovType("suprimento"); setOpenDlg("mov"); }}><PlusCircle className="h-4 w-4" />Suprimento</Button>
            <Button variant="outline" size="sm" onClick={() => { setMovType("reforco"); setOpenDlg("mov"); }}><RefreshCcw className="h-4 w-4" />Reforço</Button>
            <Button variant="destructive" size="sm" onClick={() => setOpenDlg("close")}><Lock className="h-4 w-4" />Fechar caixa</Button>
          </div>
        )}
      </div>

      {/* Dashboard */}
      {session.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <KCard label="Saldo inicial" value={fmtMoney(saldoInicial)} icon={<Wallet className="h-4 w-4" />} />
          <KCard label="Entradas" value={fmtMoney(agg.entradas)} color="text-success" icon={<TrendingUp className="h-4 w-4" />} />
          <KCard label="Saídas" value={fmtMoney(agg.saidas)} color="text-destructive" icon={<TrendingDown className="h-4 w-4" />} />
          <KCard label="Vendas do dia" value={fmtMoney(agg.vendas)} icon={<ReceiptText className="h-4 w-4" />} />
          <KCard label="Recebimentos" value={fmtMoney(agg.recebimentos)} />
          <KCard label="Sangrias" value={fmtMoney(agg.sangrias)} color="text-destructive" />
          <KCard label="Suprimentos" value={fmtMoney(agg.suprimentos)} color="text-success" />
          <KCard label="Reforços" value={fmtMoney(agg.reforcos)} color="text-success" />
          <KCard label="Estornos" value={fmtMoney(agg.estornos)} color="text-destructive" />
          <KCard label="Qtd. vendas" value={String(agg.qtdVendas)} />
          <KCard label="Ticket médio" value={fmtMoney(ticketMedio)} />
          <KCard label="Saldo atual" value={fmtMoney(saldoAtual)} highlight />
        </div>
      )}

      {session.data && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="pagamentos">Formas de pagamento</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Resumo */}
          <TabsContent value="resumo" className="mt-4">
            <Card className="p-4">
              <h2 className="mb-3 font-semibold">Movimentações recentes</h2>
              <MovementsTable rows={rows.slice(0, 10)} operador={me.data?.nome ?? "—"} />
            </Card>
          </TabsContent>

          {/* Movimentações */}
          <TabsContent value="movimentacoes" className="mt-4 space-y-3">
            <Card className="p-3">
              <div className="grid gap-2 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label className="text-xs">Buscar</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Descrição / ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={fTipo} onValueChange={setFTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {Object.entries(TIPO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Forma</Label>
                  <Select value={fForma} onValueChange={setFForma}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {PAY_METHODS.map((p) => <SelectItem key={p} value={p}>{paymentLabel[p] ?? p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Valor mín.</Label>
                  <Input type="number" step="0.01" value={fMin} onChange={(e) => setFMin(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Valor máx.</Label>
                  <Input type="number" step="0.01" value={fMax} onChange={(e) => setFMax(e.target.value)} />
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>Limpar</Button>
                  <Button variant="outline" size="sm" onClick={() => exportCsv(
                    filtered.map((m, i) => ({
                      n: i + 1,
                      data: fmtDate(m.created_at),
                      tipo: TIPO_LABEL[m.tipo] ?? m.tipo,
                      descricao: m.descricao ?? "",
                      forma: m.forma_pagamento ? (paymentLabel[m.forma_pagamento] ?? m.forma_pagamento) : "",
                      operador: me.data?.nome ?? "",
                      valor: Number(m.valor).toFixed(2),
                    })),
                    `caixa-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`,
                  )}>
                    <Download className="h-4 w-4" />Exportar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />Imprimir
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <MovementsTable rows={filtered} operador={me.data?.nome ?? "—"} numbered />
              <div className="border-t border-border p-3 text-xs text-muted-foreground">
                {filtered.length} de {rows.length} movimentações · Total filtrado: <strong>{fmtMoney(filtered.reduce((s, m) => s + Number(m.valor), 0))}</strong>
              </div>
            </Card>
          </TabsContent>

          {/* Formas de pagamento */}
          <TabsContent value="pagamentos" className="mt-4">
            <Card className="p-4">
              <h2 className="mb-3 font-semibold">Totais por forma de pagamento</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PAY_METHODS.map((p) => (
                  <div key={p} className="rounded border border-border p-3">
                    <div className="text-xs text-muted-foreground">{paymentLabel[p] ?? p}</div>
                    <div className={`mt-1 font-display text-lg font-bold ${agg.byPay[p] < 0 ? "text-destructive" : ""}`}>{fmtMoney(agg.byPay[p])}</div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Histórico da sessão atual */}
          <TabsContent value="historico" className="mt-4">
            <Card className="overflow-hidden">
              <div className="border-b border-border p-3 font-semibold">Todas as movimentações desta sessão</div>
              <MovementsTable rows={rows} operador={me.data?.nome ?? "—"} numbered />
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Histórico geral de sessões */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Histórico de fechamentos</h2>
          <Button variant="outline" size="sm" onClick={() => exportCsv(
            (history.data ?? []).map((s) => ({
              aberto: fmtDate(s.aberto_em),
              fechado: s.fechado_em ? fmtDate(s.fechado_em) : "",
              saldo_inicial: Number(s.saldo_inicial).toFixed(2),
              saldo_esperado: Number(s.saldo_esperado ?? 0).toFixed(2),
              saldo_final: Number(s.saldo_final ?? 0).toFixed(2),
              diferenca: Number(s.diferenca ?? 0).toFixed(2),
              observacoes: s.observacoes ?? "",
            })),
            `caixa-fechamentos-${new Date().toISOString().slice(0, 10)}.csv`,
          )}>
            <Download className="h-4 w-4" />Exportar
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Abertura</th>
                <th className="px-3 py-2">Fechamento</th>
                <th className="px-3 py-2 text-right">Saldo inicial</th>
                <th className="px-3 py-2 text-right">Esperado</th>
                <th className="px-3 py-2 text-right">Contado</th>
                <th className="px-3 py-2 text-right">Diferença</th>
                <th className="px-3 py-2">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(history.data ?? []).map((s) => {
                const diff = Number(s.diferenca ?? 0);
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{fmtDate(s.aberto_em)}</td>
                    <td className="px-3 py-2">{s.fechado_em ? fmtDate(s.fechado_em) : "—"}</td>
                    <td className="px-3 py-2 text-right">{fmtMoney(Number(s.saldo_inicial))}</td>
                    <td className="px-3 py-2 text-right">{fmtMoney(Number(s.saldo_esperado ?? 0))}</td>
                    <td className="px-3 py-2 text-right">{fmtMoney(Number(s.saldo_final ?? 0))}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${diff === 0 ? "" : diff > 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(diff)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.observacoes ?? "—"}</td>
                  </tr>
                );
              })}
              {(history.data ?? []).length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Sem histórico</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {openDlg === "open" && <OpenDialog onClose={() => { setOpenDlg(null); qc.invalidateQueries(); }} />}
      {openDlg === "close" && session.data && (
        <CloseDialog
          session={session.data}
          saldoEsperado={saldoAtual}
          resumo={agg}
          onClose={() => { setOpenDlg(null); qc.invalidateQueries(); }}
        />
      )}
      {openDlg === "mov" && session.data && (
        <MovDialog tipo={movType} sessionId={session.data.id} onClose={() => { setOpenDlg(null); qc.invalidateQueries(); }} />
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function KCard({ label, value, color, highlight, icon }: any) {
  return (
    <Card className={`p-3 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className={`mt-1 font-display text-lg font-bold ${color ?? ""}`}>{value}</div>
    </Card>
  );
}

function MovementsTable({ rows, operador, numbered }: { rows: any[]; operador: string; numbered?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            {numbered && <th className="px-3 py-2">#</th>}
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Descrição</th>
            <th className="px-3 py-2">Pagto</th>
            <th className="px-3 py-2">Operador</th>
            <th className="px-3 py-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((m, i) => {
            const isIn = TIPO_ENTRADA.has(m.tipo);
            return (
              <tr key={m.id}>
                {numbered && <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>}
                <td className="px-3 py-2 text-muted-foreground">{fmtDate(m.created_at)}</td>
                <td className="px-3 py-2">
                  <Badge variant={isIn ? "default" : "destructive"} className="capitalize">{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                </td>
                <td className="px-3 py-2">{m.descricao ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.forma_pagamento ? (paymentLabel[m.forma_pagamento] ?? m.forma_pagamento) : "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{operador}</td>
                <td className={`px-3 py-2 text-right font-semibold ${isIn ? "text-success" : "text-destructive"}`}>
                  {isIn ? "+" : "-"} {fmtMoney(Number(m.valor))}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={numbered ? 7 : 6} className="py-6 text-center text-muted-foreground">Sem movimentações</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OpenDialog({ onClose }: any) {
  const [saldo, setSaldo] = useState(0);
  const [obs, setObs] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
      if (existing?.id) throw new Error("Já existe uma sessão aberta. Feche antes de abrir outra.");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_sessions").insert({ saldo_inicial: saldo, aberto_por: u.user?.id, observacoes: obs || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Caixa aberto"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Abrir caixa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Saldo inicial (R$)</Label><Input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} autoFocus /></div>
          <div><Label>Observações (opcional)</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Abrir</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ session, saldoEsperado, resumo, onClose }: any) {
  const [contado, setContado] = useState<number>(saldoEsperado);
  const [obs, setObs] = useState("");
  const diff = Number(contado) - Number(saldoEsperado);
  const m = useMutation({
    mutationFn: async () => {
      if (diff !== 0 && !obs.trim()) throw new Error("Justifique a diferença antes de confirmar.");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_sessions").update({
        status: "fechada",
        saldo_final: contado,
        saldo_esperado: saldoEsperado,
        diferenca: diff,
        observacoes: obs || null,
        fechado_em: new Date().toISOString(),
        fechado_por: u.user?.id,
      }).eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Caixa fechado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Fechar caixa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Saldo inicial" value={fmtMoney(Number(session.saldo_inicial))} />
            <Info label="Vendas" value={fmtMoney(resumo.vendas)} />
            <Info label="Entradas" value={fmtMoney(resumo.entradas)} />
            <Info label="Saídas" value={fmtMoney(resumo.saidas)} />
            <Info label="Sangrias" value={fmtMoney(resumo.sangrias)} />
            <Info label="Suprimentos" value={fmtMoney(resumo.suprimentos)} />
          </div>
          <div className="rounded bg-muted p-3 text-sm">Saldo esperado: <strong>{fmtMoney(saldoEsperado)}</strong></div>
          <div><Label>Saldo contado (R$)</Label><Input type="number" step="0.01" value={contado} onChange={(e) => setContado(Number(e.target.value))} /></div>
          {diff !== 0 && (
            <div className={`text-sm ${diff > 0 ? "text-success" : "text-destructive"}`}>
              Diferença: <strong>{fmtMoney(diff)}</strong>
            </div>
          )}
          <div>
            <Label>{diff !== 0 ? "Justificativa (obrigatória)" : "Observações"}</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => m.mutate()} disabled={m.isPending}>Confirmar fechamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function MovDialog({ tipo, sessionId, onClose }: any) {
  const [valor, setValor] = useState<number>(0);
  const [desc, setDesc] = useState("");
  const [forma, setForma] = useState<string>("dinheiro");
  const needsForma = tipo === "entrada" || tipo === "saida";
  const m = useMutation({
    mutationFn: async () => {
      if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_movements").insert({
        session_id: sessionId,
        tipo,
        valor,
        descricao: desc || null,
        forma_pagamento: needsForma ? (forma as any) : null,
        criado_por: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lançado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="capitalize">{TIPO_LABEL[tipo] ?? tipo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} autoFocus /></div>
          <div><Label>Descrição {tipo === "sangria" ? "/ motivo" : ""}</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          {needsForma && (
            <div>
              <Label>Forma</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_METHODS.filter((p) => p !== "multiplo").map((p) => (
                    <SelectItem key={p} value={p}>{paymentLabel[p] ?? p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
