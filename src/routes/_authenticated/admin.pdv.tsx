import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fmtMoney } from "@/lib/format";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Coffee, Store, Bike, PackageCheck,
  Star, Barcode, Clock, Pause, Play, Percent, Split, StickyNote, XCircle, Printer, Package,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pdv")({
  validateSearch: (search: Record<string, unknown>) => ({
    mesa: typeof search.mesa === "string" ? search.mesa : undefined,
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  component: PDVPage,
});

type Complemento = { id: string; nome: string; preco: number };
type CartLine = {
  key: string;                 // unique per line (product + complementos + obs)
  product_id?: string;
  combo_id?: string;
  nome: string;
  preco: number;               // preço unitário (produto + complementos)
  base_preco: number;          // preço base do produto sem complementos
  quantidade: number;
  desconto: number;            // desconto em R$ na linha (total, não por unidade)
  observacoes?: string;
  complementos: Complemento[];
};
type Atendimento = "balcao" | "mesa" | "retirada" | "delivery";
type Pgto = "pix" | "dinheiro" | "credito" | "debito" | "vale" | "credito_cliente";
type PagamentoLinha = { forma: Pgto; valor: number };
type Held = { id: string; label: string; cart: CartLine[]; atendimento: Atendimento | null; savedAt: string };

const ATENDIMENTOS: { key: Atendimento; label: string; icon: any; tipo: string; origem: string }[] = [
  { key: "balcao",   label: "Balcão",   icon: Store,        tipo: "retirada", origem: "pdv"  },
  { key: "mesa",     label: "Mesa",     icon: Coffee,       tipo: "local",    origem: "mesa" },
  { key: "retirada", label: "Retirada", icon: PackageCheck, tipo: "retirada", origem: "pdv"  },
  { key: "delivery", label: "Delivery", icon: Bike,         tipo: "entrega",  origem: "pdv"  },
];

const PGTO_LABEL: Record<Pgto, string> = {
  dinheiro: "Dinheiro", pix: "Pix", credito: "Crédito", debito: "Débito", vale: "Vale", credito_cliente: "Crédito cliente",
};

const HELD_KEY = "pdv_held_v1";
const RECENT_KEY = "pdv_recent_v1";

function loadHeld(): Held[] {
  try { return JSON.parse(localStorage.getItem(HELD_KEY) ?? "[]"); } catch { return []; }
}
function saveHeld(list: Held[]) { localStorage.setItem(HELD_KEY, JSON.stringify(list)); }
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function pushRecent(id: string) {
  const cur = loadRecent().filter((x) => x !== id);
  cur.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 12)));
}

function newLineKey(product_id: string | undefined, combo_id: string | undefined, comps: Complemento[], obs?: string) {
  return `${product_id ?? "c"}_${combo_id ?? ""}_${comps.map((c) => c.id).sort().join(",")}_${obs ?? ""}_${Math.random().toString(36).slice(2, 6)}`;
}

function PDVPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [tab, setTab] = useState<"produtos" | "combos" | "favoritos" | "recentes">("produtos");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [existingOrderNumero, setExistingOrderNumero] = useState<number | null>(null);
  const [descOrder, setDescOrder] = useState(0);
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [mesaId, setMesaId] = useState<string>("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTel, setClienteTel] = useState("");
  const [obs, setObs] = useState("");
  const [taxa, setTaxa] = useState(0);
  const [horario, setHorario] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [end, setEnd] = useState({ cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "", referencia: "" });
  const [cepLoading, setCepLoading] = useState(false);

  // pagamento misto + troco
  const [pagamentos, setPagamentos] = useState<PagamentoLinha[]>([{ forma: "dinheiro", valor: 0 }]);
  const [recebido, setRecebido] = useState(0); // para calcular troco quando 1ª forma é dinheiro
  const [pessoas, setPessoas] = useState(1);

  // modais
  const [complementModal, setComplementModal] = useState<{ product: any; groups: any[] } | null>(null);
  const [lineEdit, setLineEdit] = useState<CartLine | null>(null);
  const [holdName, setHoldName] = useState("");
  const [heldOpen, setHeldOpen] = useState(false);
  const [held, setHeld] = useState<Held[]>([]);
  const [lastOrder, setLastOrder] = useState<{ id: string; numero: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHeld(loadHeld()); }, []);

  // Autoload mesa/order coming from /admin/mesas (Novo pedido / Continuar atendimento)
  useEffect(() => {
    if (!search.mesa) return;
    setAtendimento("mesa");
    setMesaId(search.mesa);

    if (!search.order) return;
    let cancelled = false;
    (async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("id, numero, observacoes, cliente_nome, cliente_telefone, order_items(id, product_id, combo_id, produto_nome, quantidade, preco_unitario, desconto, observacoes, complementos)")
        .eq("id", search.order!)
        .maybeSingle();
      if (cancelled || !order) return;
      setExistingOrderId(order.id);
      setExistingOrderNumero(order.numero);
      setClienteNome(order.cliente_nome ?? "");
      setClienteTel(order.cliente_telefone ?? "");
      setObs(order.observacoes ?? "");
      const lines: CartLine[] = (order.order_items ?? []).map((it: any) => {
        const comps = Array.isArray(it.complementos) ? it.complementos : [];
        const preco = Number(it.preco_unitario);
        return {
          key: newLineKey(it.product_id, it.combo_id, comps, it.observacoes ?? ""),
          product_id: it.product_id ?? undefined,
          combo_id: it.combo_id ?? undefined,
          nome: it.produto_nome,
          preco,
          base_preco: preco,
          quantidade: Number(it.quantidade),
          desconto: Number(it.desconto ?? 0),
          observacoes: it.observacoes ?? undefined,
          complementos: comps,
        };
      });
      setCart(lines);
      toast.success(`Retomando pedido #${order.numero}`);
    })();
    return () => { cancelled = true; };
  }, [search.mesa, search.order]);



  // queries
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("ativo", true).order("ordem")).data ?? [],
    staleTime: 5 * 60_000,
  });
  const products = useQuery({
    queryKey: ["admin-products-pdv"],
    queryFn: async () => (await supabase.from("products").select("*").eq("ativo", true).eq("disponivel", true).order("nome")).data ?? [],
    staleTime: 60_000,
  });
  const combos = useQuery({
    queryKey: ["admin-combos-pdv"],
    queryFn: async () => (await supabase.from("combos").select("*").eq("ativo", true).order("ordem")).data ?? [],
    staleTime: 5 * 60_000,
  });
  const mesas = useQuery({
    queryKey: ["tables-pdv"],
    queryFn: async () => (await supabase.from("restaurant_tables").select("*").order("numero")).data ?? [],
  });
  const pcg = useQuery({
    queryKey: ["product-complement-groups"],
    queryFn: async () => (await supabase.from("product_complement_groups").select("*")).data ?? [],
    staleTime: 5 * 60_000,
  });
  const compGroups = useQuery({
    queryKey: ["complement-groups"],
    queryFn: async () => (await supabase.from("complement_groups").select("*, complements(*)").eq("ativo", true)).data ?? [],
    staleTime: 5 * 60_000,
  });

  const recent = loadRecent();

  const filtered = useMemo(() => {
    let list = (products.data ?? []) as any[];
    if (tab === "favoritos") list = list.filter((p) => p.favorito);
    if (tab === "recentes") {
      const map = new Map(list.map((p) => [p.id, p]));
      list = recent.map((id) => map.get(id)).filter(Boolean);
    }
    if (cat && tab === "produtos") list = list.filter((p) => p.category_id === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) =>
        p.nome.toLowerCase().includes(s) ||
        (p.codigo && p.codigo.toLowerCase().includes(s)) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(s))
      );
    }
    return list;
  }, [products.data, cat, q, tab, recent]);

  const filteredCombos = useMemo(() => {
    const list = combos.data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((c) => c.nome.toLowerCase().includes(s));
  }, [combos.data, q]);

  function groupsForProduct(productId: string) {
    const groupIds = (pcg.data ?? []).filter((r: any) => r.product_id === productId).map((r: any) => r.group_id);
    return (compGroups.data ?? []).filter((g: any) => groupIds.includes(g.id));
  }

  function addProduct(p: any) {
    const groups = groupsForProduct(p.id);
    if (groups.length > 0) {
      setComplementModal({ product: p, groups });
      return;
    }
    const preco = Number(p.preco_promo ?? p.preco);
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id && i.complementos.length === 0 && !i.observacoes);
      if (ex) return c.map((i) => i === ex ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...c, {
        key: newLineKey(p.id, undefined, [], ""), product_id: p.id, nome: p.nome,
        preco, base_preco: preco, quantidade: 1, desconto: 0, complementos: [],
      }];
    });
    pushRecent(p.id);
  }

  function addCombo(cb: any) {
    const preco = Number(cb.preco);
    setCart((c) => [...c, {
      key: newLineKey(undefined, cb.id, []), combo_id: cb.id, nome: `Combo: ${cb.nome}`,
      preco, base_preco: preco, quantidade: 1, desconto: 0, complementos: [],
    }]);
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const val = q.trim();
    if (!val) return;
    const match = (products.data ?? []).find((p: any) => p.codigo_barras === val || p.codigo === val);
    if (match) { addProduct(match); setQ(""); }
  }

  const subtotal = cart.reduce((s, i) => s + i.preco * i.quantidade - i.desconto, 0);
  const total = Math.max(0, subtotal - descOrder + (atendimento === "delivery" ? Number(taxa) : 0));
  const perPessoa = pessoas > 1 ? total / pessoas : total;

  // Sync pagamentos com total
  useEffect(() => {
    if (!checkout) return;
    setPagamentos((ps) => {
      if (ps.length === 1) return [{ ...ps[0], valor: total }];
      return ps;
    });
  }, [total, checkout]);

  const totalPago = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const restante = Math.max(0, total - totalPago);
  const trocoDinheiro = (() => {
    const dinheiroPago = pagamentos.filter((p) => p.forma === "dinheiro").reduce((s, p) => s + Number(p.valor || 0), 0);
    if (dinheiroPago <= 0) return 0;
    return Math.max(0, recebido - dinheiroPago);
  })();

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    setEnd((e) => ({ ...e, cep }));
    if (cep.length !== 8) return;
    try {
      setCepLoading(true);
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) { toast.error("CEP não encontrado"); return; }
      setEnd((e) => ({ ...e, rua: j.logradouro || e.rua, bairro: j.bairro || e.bairro, cidade: j.localidade || e.cidade, estado: j.uf || e.estado }));
    } catch { toast.error("Falha ao buscar CEP"); }
    finally { setCepLoading(false); }
  }

  function openCheckout() {
    if (!atendimento) { toast.error("Selecione o tipo de atendimento"); return; }
    if (cart.length === 0) { toast.error("Adicione itens"); return; }
    if (atendimento === "mesa" && !mesaId) { toast.error("Selecione a mesa"); return; }
    if (atendimento === "delivery") {
      if (!clienteNome || !clienteTel) { toast.error("Nome e telefone são obrigatórios"); return; }
      if (!end.cep || !end.rua || !end.numero || !end.bairro || !end.cidade || !end.estado) { toast.error("Preencha o endereço"); return; }
    }
    if (atendimento === "retirada" && !clienteNome) { toast.error("Nome do cliente é obrigatório"); return; }
    setPagamentos([{ forma: "dinheiro", valor: total }]);
    setRecebido(0);
    setCheckout(true);
  }

  function cancelSale() {
    if (cart.length === 0) return;
    if (!confirm("Cancelar a venda em andamento?")) return;
    resetSale();
    toast.info("Venda cancelada");
  }

  function resetSale() {
    setCart([]); setDescOrder(0); setClienteNome(""); setClienteTel(""); setObs(""); setTaxa(0); setHorario("");
    setMesaId(""); setAtendimento(null); setCheckout(false); setPessoas(1); setRecebido(0);
    setEnd({ cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "", referencia: "" });
    setPagamentos([{ forma: "dinheiro", valor: 0 }]);
  }

  function suspendSale() {
    if (cart.length === 0) { toast.error("Sem itens"); return; }
    const label = holdName.trim() || `Venda ${new Date().toLocaleTimeString("pt-BR")}`;
    const list = loadHeld();
    list.push({ id: crypto.randomUUID(), label, cart, atendimento, savedAt: new Date().toISOString() });
    saveHeld(list); setHeld(list); setHoldName("");
    toast.success(`Venda suspensa: ${label}`);
    resetSale();
  }

  function resumeSale(h: Held) {
    setCart(h.cart); setAtendimento(h.atendimento);
    const list = loadHeld().filter((x) => x.id !== h.id);
    saveHeld(list); setHeld(list); setHeldOpen(false);
  }

  function removeHeld(id: string) {
    const list = loadHeld().filter((x) => x.id !== id);
    saveHeld(list); setHeld(list);
  }

  async function toggleFavorito(p: any, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("products").update({ favorito: !p.favorito }).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["admin-products-pdv"] });
  }

  function printReceipt(order: { id: string; numero: number }) {
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    const linhas = cart.map((i) => {
      const c = i.complementos.length ? `<div style="font-size:11px;color:#666;padding-left:12px">+ ${i.complementos.map((x) => x.nome).join(", ")}</div>` : "";
      const o = i.observacoes ? `<div style="font-size:11px;color:#666;padding-left:12px">obs: ${i.observacoes}</div>` : "";
      return `<div style="display:flex;justify-content:space-between"><span>${i.quantidade}x ${i.nome}</span><span>${fmtMoney(i.preco * i.quantidade - i.desconto)}</span></div>${c}${o}`;
    }).join("");
    const pgts = pagamentos.filter((p) => p.valor > 0).map((p) => `<div style="display:flex;justify-content:space-between"><span>${PGTO_LABEL[p.forma]}</span><span>${fmtMoney(p.valor)}</span></div>`).join("");
    w.document.write(`<html><head><title>Pedido #${order.numero}</title>
      <style>body{font-family:monospace;padding:12px;font-size:13px}h2{text-align:center;margin:4px 0}hr{border:none;border-top:1px dashed #999;margin:8px 0}</style>
      </head><body>
      <h2>Pedido #${order.numero}</h2>
      <div style="text-align:center;font-size:11px">${new Date().toLocaleString("pt-BR")}</div>
      <hr/>${linhas}<hr/>
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>
      ${descOrder ? `<div style="display:flex;justify-content:space-between"><span>Desconto</span><span>-${fmtMoney(descOrder)}</span></div>` : ""}
      ${atendimento === "delivery" && taxa ? `<div style="display:flex;justify-content:space-between"><span>Taxa entrega</span><span>${fmtMoney(taxa)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px"><span>TOTAL</span><span>${fmtMoney(total)}</span></div>
      <hr/>${pgts}
      ${trocoDinheiro > 0 ? `<div style="display:flex;justify-content:space-between"><span>Troco</span><span>${fmtMoney(trocoDinheiro)}</span></div>` : ""}
      <hr/><div style="text-align:center">Obrigado!</div>
      <script>window.print();setTimeout(()=>window.close(),300)</script>
      </body></html>`);
    w.document.close();
  }

  function reprintLast() {
    if (!lastOrder) { toast.info("Nenhum pedido recente"); return; }
    printReceipt(lastOrder);
  }

  const finalize = useMutation({
    mutationFn: async () => {
      if (Math.abs(totalPago - total) > 0.01) throw new Error(`Pagamento não confere. Faltam ${fmtMoney(restante)}`);
      const cfg = ATENDIMENTOS.find((a) => a.key === atendimento)!;
      const pagsValidos = pagamentos.filter((p) => p.valor > 0);
      const forma_pagamento = pagsValidos.length > 1 ? "multiplo" : pagsValidos[0]?.forma ?? "dinheiro";

      const payload: any = {
        cliente_nome: clienteNome || (atendimento === "mesa" ? `Mesa ${(mesas.data ?? []).find((m) => m.id === mesaId)?.numero ?? ""}` : "Balcão"),
        cliente_telefone: clienteTel || null,
        origem: cfg.origem, tipo: cfg.tipo,
        status: atendimento === "mesa" ? "em_preparo" : "finalizado",
        subtotal, desconto: descOrder,
        taxa_entrega: atendimento === "delivery" ? Number(taxa) : 0,
        total, forma_pagamento, observacoes: obs || null,
      };
      if (atendimento === "mesa") payload.mesa_id = mesaId;
      if (atendimento === "retirada" && horario) payload.horario_retirada = horario;
      if (atendimento === "delivery") {
        Object.assign(payload, {
          cep: end.cep, rua: end.rua, numero_endereco: end.numero, bairro: end.bairro,
          cidade: end.cidade, estado: end.estado, complemento: end.complemento || null,
          ponto_referencia: end.referencia || null,
          cliente_endereco: `${end.rua}, ${end.numero} - ${end.bairro}`,
        });
      }
      if (atendimento !== "mesa") payload.finalizado_em = new Date().toISOString();

      const { data: order, error } = await supabase.from("orders").insert(payload).select("id, numero").single();
      if (error) throw error;
      const { error: oiErr } = await supabase.from("order_items").insert(cart.map((i) => ({
        order_id: order!.id, product_id: i.product_id ?? null, combo_id: i.combo_id ?? null,
        produto_nome: i.nome, quantidade: i.quantidade, preco_unitario: i.preco,
        desconto: i.desconto, subtotal: i.preco * i.quantidade - i.desconto,
        observacoes: i.observacoes ?? null, complementos: i.complementos,
      })));
      if (oiErr) throw oiErr;

      if (atendimento === "mesa") {
        await supabase.from("restaurant_tables").update({ status: "ocupada", ocupada_em: new Date().toISOString() }).eq("id", mesaId);
      } else {
        const { data: session } = await supabase.from("cash_sessions").select("id").eq("status", "aberta").maybeSingle();
        if (session) {
          await supabase.from("cash_movements").insert(pagsValidos.map((p) => ({
            session_id: session.id, tipo: "venda", valor: p.valor,
            descricao: `${cfg.label} #${order!.numero}`, forma_pagamento: p.forma, order_id: order!.id,
          })));
        }
      }
      return order!;
    },
    onSuccess: (order) => {
      toast.success(`Venda #${order.numero} registrada`);
      setLastOrder(order);
      printReceipt(order);
      resetSale();
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">

      {/* ============ ESQUERDA: catálogo ============ */}
      <div className="flex flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ATENDIMENTOS.map((a) => {
            const Icon = a.icon; const active = atendimento === a.key;
            return (
              <button key={a.key} type="button" onClick={() => setAtendimento(a.key)}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground shadow" : "border-border bg-card hover:border-primary/40"}`}>
                <Icon className="h-4 w-4" /> {a.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey}
              className="pl-9" placeholder="Buscar por nome, código ou código de barras (Enter para adicionar)" />
          </div>
          <Select value={cat ?? "all"} onValueChange={(v) => setCat(v === "all" ? null : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => { setHeldOpen(true); setHeld(loadHeld()); }} title="Vendas suspensas">
            <Clock className="h-4 w-4" />
            {held.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{held.length}</span>}
          </Button>
          <Button variant="outline" size="icon" onClick={reprintLast} title="Reimprimir último"><Printer className="h-4 w-4" /></Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="produtos"><Package className="mr-1 h-3 w-3" />Produtos</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
            <TabsTrigger value="favoritos"><Star className="mr-1 h-3 w-3" />Favoritos</TabsTrigger>
            <TabsTrigger value="recentes"><Clock className="mr-1 h-3 w-3" />Recentes</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="mt-2 flex-1 overflow-hidden">
            <ProductGrid list={filtered} onAdd={addProduct} onFav={toggleFavorito} />
          </TabsContent>
          <TabsContent value="combos" className="mt-2 flex-1 overflow-hidden">
            <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
              {filteredCombos.map((cb) => (
                <button key={cb.id} onClick={() => addCombo(cb)} className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent/20">
                  <div className="line-clamp-2 text-sm font-medium">🍽️ {cb.nome}</div>
                  <div className="mt-1 font-display text-base font-bold text-primary">{fmtMoney(Number(cb.preco))}</div>
                </button>
              ))}
              {filteredCombos.length === 0 && <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum combo</div>}
            </div>
          </TabsContent>
          <TabsContent value="favoritos" className="mt-2 flex-1 overflow-hidden">
            <ProductGrid list={filtered} onAdd={addProduct} onFav={toggleFavorito} empty="Marque produtos com a estrela ⭐ para acessá-los aqui" />
          </TabsContent>
          <TabsContent value="recentes" className="mt-2 flex-1 overflow-hidden">
            <ProductGrid list={filtered} onAdd={addProduct} onFav={toggleFavorito} empty="Nenhum produto usado recentemente" />
          </TabsContent>
        </Tabs>
      </div>

      {/* ============ DIREITA: comanda ============ */}
      <Card className="flex min-h-[420px] flex-col overflow-hidden p-4 lg:min-h-0">
        <div className="mb-3 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <h2 className="font-semibold">Comanda</h2>
          {atendimento && <span className="ml-auto text-xs text-muted-foreground">{ATENDIMENTOS.find((a) => a.key === atendimento)?.label}</span>}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {cart.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Sem itens</div>}
          {cart.map((i) => (
            <div key={i.key} className="rounded-md border border-border p-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium leading-tight">{i.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtMoney(i.preco)} {i.desconto > 0 && <span className="ml-1 text-destructive">-{fmtMoney(i.desconto)}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold">{fmtMoney(i.preco * i.quantidade - i.desconto)}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((c) => c.map((x) => x.key === i.key ? { ...x, quantidade: Math.max(1, x.quantidade - 1) } : x))}><Minus className="h-3 w-3" /></Button>
                <span className="w-6 text-center">{i.quantidade}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((c) => c.map((x) => x.key === i.key ? { ...x, quantidade: x.quantidade + 1 } : x))}><Plus className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLineEdit(i)} title="Editar"><StickyNote className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((c) => c.filter((x) => x.key !== i.key))} title="Remover"><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>

              {(i.complementos.length > 0 || i.observacoes) && (
                <div className="mt-1 space-y-0.5 pl-1 text-xs text-muted-foreground">
                  {i.complementos.length > 0 && <div>+ {i.complementos.map((c) => c.nome).join(", ")}</div>}
                  {i.observacoes && <div>📝 {i.observacoes}</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Percent className="h-3 w-3" />Desconto</span>
            <Input type="number" min={0} value={descOrder} onChange={(e) => setDescOrder(Number(e.target.value))} className="h-8 w-24 text-right" />
          </div>
          {atendimento === "delivery" && (
            <div className="flex items-center justify-between">
              <span>Taxa entrega</span>
              <Input type="number" min={0} value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} className="h-8 w-24 text-right" />
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-display text-xl font-bold">
            <span>Total</span><span className="text-primary">{fmtMoney(total)}</span>
          </div>
          {pessoas > 1 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Por pessoa ({pessoas})</span><span>{fmtMoney(perPessoa)}</span>
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          <Button variant="outline" size="sm" onClick={suspendSale} disabled={cart.length === 0}><Pause className="mr-1 h-3 w-3" />Suspender</Button>
          <Button variant="outline" size="sm" onClick={() => { const n = prompt("Dividir por quantas pessoas?", String(pessoas)); if (n) setPessoas(Math.max(1, Number(n) || 1)); }}>
            <Split className="mr-1 h-3 w-3" />Dividir
          </Button>
          <Button variant="outline" size="sm" onClick={cancelSale} disabled={cart.length === 0}><XCircle className="mr-1 h-3 w-3" />Cancelar</Button>
        </div>
        <Button size="lg" className="mt-2" disabled={cart.length === 0 || !atendimento} onClick={openCheckout}>
          {atendimento ? "Finalizar venda" : "Escolha o atendimento"}
        </Button>
      </Card>

      {/* ============ Modal: complementos ============ */}
      {complementModal && (
        <ComplementModal
          product={complementModal.product}
          groups={complementModal.groups}
          onClose={() => setComplementModal(null)}
          onConfirm={(comps, observacoes, qty) => {
            const p = complementModal.product;
            const base = Number(p.preco_promo ?? p.preco);
            const preco = base + comps.reduce((s, c) => s + c.preco, 0);
            setCart((c) => [...c, {
              key: newLineKey(p.id, undefined, comps, observacoes), product_id: p.id, nome: p.nome,
              preco, base_preco: base, quantidade: qty, desconto: 0, complementos: comps, observacoes,
            }]);
            pushRecent(p.id);
            setComplementModal(null);
          }}
        />
      )}

      {/* ============ Modal: editar linha ============ */}
      {lineEdit && (
        <Dialog open onOpenChange={() => setLineEdit(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Editar item — {lineEdit.nome}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Observações</Label><Textarea rows={2} defaultValue={lineEdit.observacoes} id="edit-obs" /></div>
              <div><Label>Desconto no item (R$)</Label><Input type="number" min={0} defaultValue={lineEdit.desconto} id="edit-desc" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLineEdit(null)}>Cancelar</Button>
              <Button onClick={() => {
                const obsEl = document.getElementById("edit-obs") as HTMLTextAreaElement;
                const descEl = document.getElementById("edit-desc") as HTMLInputElement;
                setCart((c) => c.map((x) => x.key === lineEdit.key ? { ...x, observacoes: obsEl.value || undefined, desconto: Number(descEl.value) || 0 } : x));
                setLineEdit(null);
              }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ============ Modal: vendas suspensas ============ */}
      {heldOpen && (
        <Dialog open onOpenChange={() => setHeldOpen(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Vendas suspensas ({held.length})</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {held.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda suspensa</div>}
              {held.map((h) => {
                const tot = h.cart.reduce((s, i) => s + i.preco * i.quantidade - i.desconto, 0);
                return (
                  <div key={h.id} className="flex items-center gap-2 rounded-md border p-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{h.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.cart.length} itens • {fmtMoney(tot)} • {new Date(h.savedAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => resumeSale(h)}><Play className="mr-1 h-3 w-3" />Retomar</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeHeld(h.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 border-t pt-3">
              <Input placeholder="Nome para a próxima suspensão (opcional)" value={holdName} onChange={(e) => setHoldName(e.target.value)} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ============ Modal: checkout ============ */}
      {checkout && (
        <Dialog open onOpenChange={() => setCheckout(false)}>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>Finalizar — {ATENDIMENTOS.find((a) => a.key === atendimento)?.label}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {atendimento === "mesa" && (
                <div><Label>Mesa *</Label>
                  <Select value={mesaId} onValueChange={setMesaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(mesas.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>Mesa {m.numero} — {m.capacidade} lug.</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(atendimento === "retirada" || atendimento === "delivery" || atendimento === "balcao") && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Nome {atendimento !== "balcao" && "*"}</Label><Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /></div>
                  <div><Label>Telefone {atendimento === "delivery" && "*"}</Label><Input value={clienteTel} onChange={(e) => setClienteTel(e.target.value)} /></div>
                </div>
              )}

              {atendimento === "retirada" && (
                <div><Label>Horário previsto</Label><Input type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} /></div>
              )}

              {atendimento === "delivery" && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <div><Label>CEP *</Label><Input value={end.cep} onChange={(e) => lookupCep(e.target.value)} placeholder="00000-000" disabled={cepLoading} /></div>
                    <div><Label>Rua *</Label><Input value={end.rua} onChange={(e) => setEnd({ ...end, rua: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <div><Label>Número *</Label><Input value={end.numero} onChange={(e) => setEnd({ ...end, numero: e.target.value })} /></div>
                    <div><Label>Bairro *</Label><Input value={end.bairro} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-[2fr_1fr] gap-2">
                    <div><Label>Cidade *</Label><Input value={end.cidade} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} /></div>
                    <div><Label>Estado *</Label><Input value={end.estado} maxLength={2} onChange={(e) => setEnd({ ...end, estado: e.target.value.toUpperCase() })} /></div>
                  </div>
                  <div><Label>Complemento</Label><Input value={end.complemento} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} /></div>
                  <div><Label>Ponto de referência</Label><Input value={end.referencia} onChange={(e) => setEnd({ ...end, referencia: e.target.value })} /></div>
                </div>
              )}

              <div><Label>Observações do pedido</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>

              {/* Pagamento múltiplo */}
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label>Formas de pagamento</Label>
                  <Button size="sm" variant="outline" onClick={() => setPagamentos((ps) => [...ps, { forma: "dinheiro", valor: restante }])}>
                    <Plus className="mr-1 h-3 w-3" />Adicionar
                  </Button>
                </div>
                {pagamentos.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={p.forma} onValueChange={(v) => setPagamentos((ps) => ps.map((x, i) => i === idx ? { ...x, forma: v as Pgto } : x))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PGTO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={0} step="0.01" value={p.valor}
                      onChange={(e) => setPagamentos((ps) => ps.map((x, i) => i === idx ? { ...x, valor: Number(e.target.value) } : x))}
                      className="w-32 text-right" />
                    {pagamentos.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setPagamentos((ps) => ps.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pago</span><span>{fmtMoney(totalPago)}</span>
                </div>
                {restante > 0.01 && <div className="flex justify-between text-xs text-destructive"><span>Falta</span><span>{fmtMoney(restante)}</span></div>}

                {pagamentos.some((p) => p.forma === "dinheiro" && p.valor > 0) && (
                  <div className="mt-2 border-t pt-2">
                    <Label className="text-xs">Valor recebido em dinheiro (para calcular troco)</Label>
                    <Input type="number" min={0} step="0.01" value={recebido} onChange={(e) => setRecebido(Number(e.target.value))} />
                    {trocoDinheiro > 0 && <div className="mt-1 text-right text-sm font-semibold text-primary">Troco: {fmtMoney(trocoDinheiro)}</div>}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted p-3 text-center font-display text-2xl font-bold text-primary">{fmtMoney(total)}</div>
              <Button className="w-full" size="lg" onClick={() => finalize.mutate()} disabled={finalize.isPending || Math.abs(totalPago - total) > 0.01}>
                {finalize.isPending ? "Processando..." : "Confirmar e imprimir"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ============ Grade de produtos reutilizável ============ */
function ProductGrid({ list, onAdd, onFav, empty }: { list: any[]; onAdd: (p: any) => void; onFav: (p: any, e: React.MouseEvent) => void; empty?: string }) {
  if (list.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{empty ?? "Nenhum produto encontrado"}</div>;
  }
  return (
    <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((p) => (
        <button key={p.id} onClick={() => onAdd(p)} className="group relative rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent/20">
          <button onClick={(e) => onFav(p, e)} className="absolute right-2 top-2 opacity-70 hover:opacity-100" title="Favorito">
            <Star className={`h-4 w-4 ${p.favorito ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
          </button>
          <div className="line-clamp-2 pr-6 text-sm font-medium">{p.nome}</div>
          {p.codigo && <div className="text-[10px] text-muted-foreground">#{p.codigo}</div>}
          <div className="mt-1 font-display text-base font-bold text-primary">{fmtMoney(Number(p.preco_promo ?? p.preco))}</div>
          {p.controla_estoque && (
            <div className={`mt-1 text-[10px] ${p.estoque_atual <= p.estoque_minimo ? "text-destructive" : "text-muted-foreground"}`}>
              estoque: {p.estoque_atual} {p.unidade}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/* ============ Modal de complementos ============ */
function ComplementModal({ product, groups, onClose, onConfirm }:
  { product: any; groups: any[]; onClose: () => void; onConfirm: (comps: Complemento[], obs: string, qty: number) => void }) {
  const [selected, setSelected] = useState<Record<string, Complemento[]>>({});
  const [obs, setObs] = useState("");
  const [qty, setQty] = useState(1);

  function toggle(groupId: string, comp: Complemento, max: number) {
    setSelected((s) => {
      const cur = s[groupId] ?? [];
      const has = cur.find((c) => c.id === comp.id);
      if (has) return { ...s, [groupId]: cur.filter((c) => c.id !== comp.id) };
      if (max === 1) return { ...s, [groupId]: [comp] };
      if (cur.length >= max) { toast.error(`Máximo ${max} opções`); return s; }
      return { ...s, [groupId]: [...cur, comp] };
    });
  }

  function confirm() {
    for (const g of groups) {
      const chosen = selected[g.id] ?? [];
      if (g.obrigatorio && chosen.length < g.min_escolhas) {
        toast.error(`Escolha pelo menos ${g.min_escolhas} em "${g.nome}"`);
        return;
      }
    }
    const all = Object.values(selected).flat();
    onConfirm(all, obs, qty);
  }

  const base = Number(product.preco_promo ?? product.preco);
  const extras = Object.values(selected).flat().reduce((s, c) => s + c.preco, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{product.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{g.nome} {g.obrigatorio && <span className="text-destructive">*</span>}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.max_escolhas === 1 ? "Escolha 1" : `Até ${g.max_escolhas}`}
                    {g.min_escolhas > 0 && ` • mín. ${g.min_escolhas}`}
                  </div>
                </div>
              </div>
              {g.max_escolhas === 1 ? (
                <RadioGroup value={(selected[g.id]?.[0]?.id) ?? ""} onValueChange={(v) => {
                  const c = g.complements.find((x: any) => x.id === v);
                  if (c) setSelected((s) => ({ ...s, [g.id]: [c] }));
                }}>
                  {g.complements.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                      <RadioGroupItem value={c.id} />
                      <span className="flex-1">{c.nome}</span>
                      {c.preco > 0 && <span className="text-muted-foreground">+{fmtMoney(c.preco)}</span>}
                    </label>
                  ))}
                </RadioGroup>
              ) : (
                g.complements.map((c: any) => {
                  const checked = !!selected[g.id]?.find((x) => x.id === c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(g.id, c, g.max_escolhas)} />
                      <span className="flex-1">{c.nome}</span>
                      {c.preco > 0 && <span className="text-muted-foreground">+{fmtMoney(c.preco)}</span>}
                    </label>
                  );
                })
              )}
            </div>
          ))}
          <div><Label>Observações</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: sem cebola, bem passado..." /></div>
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-3 w-3" /></Button>
              <span className="w-8 text-center">{qty}</span>
              <Button variant="outline" size="icon" onClick={() => setQty(qty + 1)}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-display text-lg font-bold text-primary">{fmtMoney((base + extras) * qty)}</div>
            </div>
          </div>
          <Button className="w-full" onClick={confirm}>Adicionar à comanda</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
