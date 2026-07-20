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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtMoney } from "@/lib/format";
import { smartFilter } from "@/lib/search";
import { ProductImage } from "@/components/ProductImage";
import { ProductImageUploader } from "@/components/ProductImageUploader";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Copy, Power, PowerOff, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { IconPicker, CategoryIcon } from "@/components/IconPicker";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { FiltersDrawer, FilterChips } from "@/components/filters/FiltersDrawer";
import { useFilters } from "@/components/filters/useFilters";


export const Route = createFileRoute("/_authenticated/admin/catalogo")({
  component: CatalogoPage,
});

function CatalogoPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Catálogo</h1>
      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos"><ProdutosTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProdutosTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(nome)")
        .order("nome", { ascending: true });
      return data ?? [];
    },
  });
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("nome", { ascending: true })).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("products").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Produto excluído"); },
  });

  const f = useFilters("catalogo", { sort: "az" });
  const { state, setState, reset, activeChips, presets, savePreset, applyPreset, removePreset } = f;

  const catOptions = useMemo(
    () => (categories.data ?? []).map((c: any) => ({ value: c.id, label: c.nome })),
    [categories.data],
  );

  const filtered = useMemo(() => {
    let list = smartFilter(products.data ?? [], state.q, [
      (p: any) => p.nome,
      (p: any) => p.descricao,
      (p: any) => p.categories?.nome,
    ]);
    if (state.categories.length > 0) list = list.filter((p: any) => state.categories.includes(p.category_id));
    if (state.valueMin != null) list = list.filter((p: any) => Number(p.preco_promo ?? p.preco) >= state.valueMin!);
    if (state.valueMax != null) list = list.filter((p: any) => Number(p.preco_promo ?? p.preco) <= state.valueMax!);
    const ativo = state.extras.ativo as string | undefined;
    if (ativo === "sim") list = list.filter((p: any) => p.ativo);
    if (ativo === "nao") list = list.filter((p: any) => !p.ativo);
    switch (state.sort) {
      case "za": list = [...list].sort((a, b) => (b.nome ?? "").localeCompare(a.nome ?? "")); break;
      case "high": list = [...list].sort((a, b) => Number(b.preco_promo ?? b.preco) - Number(a.preco_promo ?? a.preco)); break;
      case "low": list = [...list].sort((a, b) => Number(a.preco_promo ?? a.preco) - Number(b.preco_promo ?? b.preco)); break;
      case "az":
      default: list = [...list].sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? ""));
    }
    return list;
  }, [products.data, state]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FiltersDrawer
          sections={{
            search: true,
            categories: catOptions,
            valueRange: true,
            sort: [
              { value: "az", label: "A-Z" },
              { value: "za", label: "Z-A" },
              { value: "high", label: "Maior preço" },
              { value: "low", label: "Menor preço" },
            ],
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
            <div>
              <Label className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Ativo</Label>
              <Select value={(state.extras.ativo as string) ?? "todos"} onValueChange={(v) => setState((s) => ({ ...s, extras: { ...s.extras, ativo: v === "todos" ? undefined : v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Ativos</SelectItem>
                  <SelectItem value="nao">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
        <Button onClick={() => setEdit({})}><Plus className="h-4 w-4" />Novo produto</Button>
      </div>
      <FilterChips chips={activeChips} onClearAll={reset} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p: any) => (
          <Card key={p.id} className="flex gap-3 p-3">
            <ProductImage src={p.imagem_url} alt={p.nome} className="h-20 w-20 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.nome}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.categories?.nome ?? "Sem categoria"}</div>
                </div>
                <div className="shrink-0 font-display font-bold text-primary">{fmtMoney(p.preco_promo ?? p.preco)}</div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <div className="flex min-w-0 flex-wrap gap-x-2 text-xs">
                  {p.ativo ? <span className="text-success">Ativo</span> : <span className="text-muted-foreground">Inativo</span>}
                  {!p.disponivel && <span className="text-warning">Indisponível</span>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={async () => { if (await dialog.confirm({ title: "Excluir produto?", destructive: true, confirmText: "Excluir" })) del.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {edit !== null && <ProductDialog categories={categories.data ?? []} value={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function ProductDialog({ value, categories, onClose }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: value.nome ?? "",
    descricao: value.descricao ?? "",
    category_id: value.category_id ?? (categories[0]?.id ?? null),
    preco: value.preco ?? 0,
    preco_promo: value.preco_promo ?? "",
    imagem_url: value.imagem_url ?? "",
    ativo: value.ativo ?? true,
    disponivel: value.disponivel ?? true,
    ordem: value.ordem ?? 0,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        preco: Number(form.preco),
        preco_promo: form.preco_promo === "" ? null : Number(form.preco_promo),
      };
      if (value.id) await supabase.from("products").update(payload).eq("id", value.id);
      else await supabase.from("products").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{value.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço</Label><Input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value as any })} /></div>
            <div><Label>Promoção</Label><Input type="number" step="0.01" value={form.preco_promo} onChange={(e) => setForm({ ...form, preco_promo: e.target.value as any })} /></div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Imagem do produto</Label>
            <ProductImageUploader value={form.imagem_url || null} onChange={(v) => setForm({ ...form, imagem_url: v ?? "" })} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.disponivel} onCheckedChange={(v) => setForm({ ...form, disponivel: v })} />Disponível
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriasTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todas" | "ativas" | "inativas" | "com" | "sem">("todas");
  const [sort, setSort] = useState<"az" | "za" | "recent" | "produtos" | "ordem">("ordem");
  const [reassign, setReassign] = useState<{ id: string; nome: string; count: number } | null>(null);

  const cats = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("ordem", { ascending: true })).data ?? [],
  });
  const counts = useQuery({
    queryKey: ["admin-category-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category_id");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { if (r.category_id) map[r.category_id] = (map[r.category_id] ?? 0) + 1; });
      return map;
    },
  });

  const del = useMutation({
    mutationFn: async ({ id, reassignTo }: { id: string; reassignTo?: string | null }) => {
      if (reassignTo !== undefined) {
        await supabase.from("products").update({ category_id: reassignTo }).eq("category_id", id);
      }
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Categoria excluída"); setReassign(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("categories").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Atualizada"); },
  });

  const duplicate = useMutation({
    mutationFn: async (c: any) => {
      const base = { nome: `${c.nome} (cópia)`, descricao: c.descricao, icone: c.icone, cor: c.cor, ordem: (c.ordem ?? 0) + 1, ativo: c.ativo, slug: `${c.slug}-copia-${Date.now().toString(36)}` };
      const { error } = await supabase.from("categories").insert(base);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Duplicada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const list = useMemo(() => {
    const countMap = counts.data ?? {};
    let l = smartFilter(cats.data ?? [], q, [(c: any) => c.nome, (c: any) => c.descricao]);
    if (filter === "ativas") l = l.filter((c: any) => c.ativo);
    else if (filter === "inativas") l = l.filter((c: any) => !c.ativo);
    else if (filter === "com") l = l.filter((c: any) => (countMap[c.id] ?? 0) > 0);
    else if (filter === "sem") l = l.filter((c: any) => (countMap[c.id] ?? 0) === 0);
    const withCount = l.map((c: any) => ({ ...c, _count: countMap[c.id] ?? 0 }));
    switch (sort) {
      case "az": withCount.sort((a, b) => a.nome.localeCompare(b.nome)); break;
      case "za": withCount.sort((a, b) => b.nome.localeCompare(a.nome)); break;
      case "recent": withCount.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")); break;
      case "produtos": withCount.sort((a, b) => b._count - a._count); break;
      case "ordem":
      default: withCount.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    }
    return withCount;
  }, [cats.data, counts.data, q, filter, sort]);

  const filters: { key: typeof filter; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "ativas", label: "Ativas" },
    { key: "inativas", label: "Inativas" },
    { key: "com", label: "Com produtos" },
    { key: "sem", label: "Sem produtos" },
  ];

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar categoria…" className="pl-9" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ordem">Ordem de exibição</SelectItem>
              <SelectItem value="az">Nome (A–Z)</SelectItem>
              <SelectItem value="za">Nome (Z–A)</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="produtos">Mais produtos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setEdit({})}><Plus className="h-4 w-4" />Nova categoria</Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)} className="h-8">
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c: any) => (
          <Card key={c.id} className="group relative flex items-center gap-3 p-3 transition hover:border-primary/40 hover:shadow-sm">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border"
              style={c.cor ? { backgroundColor: `${c.cor}20`, borderColor: `${c.cor}55`, color: c.cor } : undefined}
            >
              <CategoryIcon name={c.icone} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate font-semibold">{c.nome}</div>
                {!c.ativo && <Badge variant="outline" className="h-5 shrink-0 text-[10px]">Inativa</Badge>}
              </div>
              {c.descricao && <div className="truncate text-xs text-muted-foreground">{c.descricao}</div>}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />{c._count} produto{c._count === 1 ? "" : "s"}</span>
                <span>Ordem {c.ordem ?? 0}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEdit(c)}><Pencil className="h-4 w-4" />Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicate.mutate(c)}><Copy className="h-4 w-4" />Duplicar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggle.mutate({ id: c.id, ativo: !c.ativo })}>
                  {c.ativo ? <><PowerOff className="h-4 w-4" />Desativar</> : <><Power className="h-4 w-4" />Ativar</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    if (c._count > 0) {
                      setReassign({ id: c.id, nome: c.nome, count: c._count });
                    } else if (await dialog.confirm({ title: "Excluir categoria?", description: `A categoria "${c.nome}" será removida.`, destructive: true, confirmText: "Excluir" })) {
                      del.mutate({ id: c.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="col-span-full flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 opacity-50" />
            <div className="text-sm">Nenhuma categoria encontrada</div>
          </Card>
        )}
      </div>

      {edit !== null && <CategoryDialog value={edit} onClose={() => setEdit(null)} existing={cats.data ?? []} />}
      {reassign && (
        <ReassignDialog
          value={reassign}
          options={(cats.data ?? []).filter((c: any) => c.id !== reassign.id)}
          onClose={() => setReassign(null)}
          onConfirm={(targetId: string | null) => del.mutate({ id: reassign.id, reassignTo: targetId })}
          pending={del.isPending}
        />
      )}
    </>
  );
}

function ReassignDialog({ value, options, onClose, onConfirm, pending }: any) {
  const [target, setTarget] = useState<string>("__none__");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir "{value.nome}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>Esta categoria possui <strong>{value.count}</strong> produto{value.count === 1 ? "" : "s"} vinculado{value.count === 1 ? "" : "s"}. Escolha o que fazer com {value.count === 1 ? "ele" : "eles"}:</p>
          <div>
            <Label>Realocar produtos para</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem categoria</SelectItem>
                {options.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={pending} onClick={() => onConfirm(target === "__none__" ? null : target)}>Excluir categoria</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#64748b"];

function CategoryDialog({ value, onClose, existing }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: value.nome ?? "",
    descricao: value.descricao ?? "",
    slug: value.slug ?? "",
    icone: value.icone ?? "tag",
    cor: value.cor ?? "",
    ordem: value.ordem ?? 0,
    ativo: value.ativo ?? true,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim();
      if (!nome) throw new Error("Informe o nome");
      const dup = (existing ?? []).some((c: any) => c.id !== value.id && c.nome.toLowerCase() === nome.toLowerCase());
      if (dup) throw new Error("Já existe uma categoria com esse nome");
      const payload = {
        nome,
        descricao: form.descricao || null,
        icone: form.icone,
        cor: form.cor || null,
        ordem: Number(form.ordem) || 0,
        ativo: form.ativo,
        slug: form.slug || nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      };
      if (value.id) { const { error } = await supabase.from("categories").update(payload).eq("id", value.id); if (error) throw error; }
      else { const { error } = await supabase.from("categories").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{value.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed transition hover:border-primary hover:bg-accent"
                style={form.cor ? { backgroundColor: `${form.cor}20`, borderColor: form.cor, color: form.cor } : undefined}
                title="Escolher ícone"
              >
                <CategoryIcon name={form.icone} className="h-7 w-7" />
              </button>
              <div className="min-w-0 flex-1">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Pizzas" />
              </div>
            </div>
            <div>
              <Label>Descrição <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Cor <span className="text-muted-foreground">(opcional)</span></Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setForm({ ...form, cor: "" })} className={`h-7 w-7 rounded-full border-2 ${!form.cor ? "border-foreground" : "border-transparent"}`} title="Sem cor">
                  <div className="h-full w-full rounded-full bg-muted" />
                </button>
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })} className={`h-7 w-7 rounded-full border-2 ${form.cor === c ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value as any })} /></div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                  Ativa
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <IconPicker
        open={pickerOpen}
        value={form.icone}
        onClose={() => setPickerOpen(false)}
        onSelect={(name) => setForm((f) => ({ ...f, icone: name }))}
      />
    </>
  );
}

