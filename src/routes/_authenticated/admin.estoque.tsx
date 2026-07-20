import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, AlertTriangle, TrendingUp, TrendingDown, History, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Controle e movimentações" },
      { name: "description", content: "Gerencie estoque atual, entradas, saídas, ajustes e histórico de movimentações." },
    ],
  }),
  component: EstoquePage,
});

type MovTipo = "entrada" | "saida" | "ajuste" | "perda";

function EstoquePage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [movOpen, setMovOpen] = useState(false);
  const [form, setForm] = useState<{ product_id: string; tipo: MovTipo; quantidade: number; motivo: string }>({
    product_id: "",
    tipo: "entrada",
    quantidade: 1,
    motivo: "",
  });

  const productsQ = useQuery({
    queryKey: ["estoque-produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, codigo, unidade, estoque_atual, estoque_minimo, controla_estoque, active")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const movsQ = useQuery({
    queryKey: ["estoque-movs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, tipo, quantidade, motivo, created_at, product_id, products(nome, codigo)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = productsQ.data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p: any) =>
      [p.nome, p.codigo].filter(Boolean).some((v: string) => v.toLowerCase().includes(q))
    );
  }, [products, query]);

  const stats = useMemo(() => {
    let total = 0, criticos = 0, zerados = 0;
    for (const p of products as any[]) {
      if (!p.controla_estoque) continue;
      total++;
      if ((p.estoque_atual ?? 0) <= 0) zerados++;
      else if ((p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0)) criticos++;
    }
    return { total, criticos, zerados };
  }, [products]);

  const saveMov = useMutation({
    mutationFn: async () => {
      if (!form.product_id) throw new Error("Selecione um produto");
      if (!form.quantidade || form.quantidade <= 0) throw new Error("Quantidade inválida");
      const prod = (products as any[]).find((p) => p.id === form.product_id);
      if (!prod) throw new Error("Produto não encontrado");

      const { error: mErr } = await supabase.from("stock_movements").insert({
        product_id: form.product_id,
        tipo: form.tipo,
        quantidade: form.quantidade,
        motivo: form.motivo || null,
      });
      if (mErr) throw mErr;

      const delta = form.tipo === "entrada" ? form.quantidade : -form.quantidade;
      const novo = (prod.estoque_atual ?? 0) + delta;
      const { error: uErr } = await supabase
        .from("products")
        .update({ estoque_atual: novo })
        .eq("id", form.product_id);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada");
      setMovOpen(false);
      setForm({ product_id: "", tipo: "entrada", quantidade: 1, motivo: "" });
      qc.invalidateQueries({ queryKey: ["estoque-produtos"] });
      qc.invalidateQueries({ queryKey: ["estoque-movs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });

  const badgeFor = (p: any) => {
    if (!p.controla_estoque) return <Badge variant="outline">Sem controle</Badge>;
    if ((p.estoque_atual ?? 0) <= 0) return <Badge variant="destructive">Sem estoque</Badge>;
    if ((p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0)) return <Badge className="bg-amber-500 text-white">Crítico</Badge>;
    return <Badge className="bg-emerald-600 text-white">OK</Badge>;
  };

  const tipoBadge = (t: MovTipo) => {
    const map: Record<MovTipo, string> = {
      entrada: "bg-emerald-600 text-white",
      saida: "bg-blue-600 text-white",
      ajuste: "bg-amber-500 text-white",
      perda: "bg-destructive text-destructive-foreground",
    };
    return <Badge className={map[t]}>{t}</Badge>;
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Boxes className="h-6 w-6" /> Estoque
          </h1>
          <p className="text-sm text-muted-foreground">Controle atual, movimentações e histórico.</p>
        </div>
        <Button onClick={() => setMovOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova movimentação
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Produtos controlados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-amber-500" /> Estoque crítico</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-500">{stats.criticos}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-destructive" /> Sem estoque</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{stats.zerados}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="atual">
        <TabsList>
          <TabsTrigger value="atual"><Boxes className="mr-2 h-4 w-4" />Situação atual</TabsTrigger>
          <TabsTrigger value="historico"><History className="mr-2 h-4 w-4" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="atual" className="space-y-3">
          <Input placeholder="Buscar por nome ou código..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Unid.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{p.codigo ?? "—"}</TableCell>
                      <TableCell className="text-right">{p.estoque_atual ?? 0}</TableCell>
                      <TableCell className="text-right">{p.estoque_minimo ?? 0}</TableCell>
                      <TableCell>{p.unidade ?? "un"}</TableCell>
                      <TableCell>{badgeFor(p)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setForm({ product_id: p.id, tipo: "entrada", quantidade: 1, motivo: "" }); setMovOpen(true); }}>
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setForm({ product_id: p.id, tipo: "saida", quantidade: 1, motivo: "" }); setMovOpen(true); }}>
                            <TrendingDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movsQ.data ?? []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{m.products?.nome ?? "—"}</TableCell>
                      <TableCell>{tipoBadge(m.tipo)}</TableCell>
                      <TableCell className="text-right">{m.quantidade}</TableCell>
                      <TableCell className="text-muted-foreground">{m.motivo ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(movsQ.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma movimentação registrada.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova movimentação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produto</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(products as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} {p.codigo ? `(${p.codigo})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: MovTipo) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea rows={2} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Compra, ajuste de inventário, perda..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMov.mutate()} disabled={saveMov.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
