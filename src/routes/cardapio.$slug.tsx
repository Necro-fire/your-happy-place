import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/public/PublicLayout";
import { ProductImage } from "@/components/ProductImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Plus, Search, Clock, MapPin, ChevronLeft, ChevronRight, X as XIcon } from "lucide-react";
import { CategoryIcon } from "@/components/IconPicker";
import { toast } from "sonner";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { cn } from "@/lib/utils";
import { loadTenantBySlug, useTenant } from "@/lib/tenant-session";

export const Route = createFileRoute("/cardapio/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Cardápio · ${params.slug}` },
      { name: "description", content: "Cardápio digital — peça online com rapidez." },
    ],
  }),
  component: CardapioPage,
});

function CardapioPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const tenant = useTenant();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (tenant?.slug === slug.toLowerCase()) return;
      const t = await loadTenantBySlug(slug);
      if (!t) setNotFound(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const tenantId = tenant?.tenant_id ?? null;
  const { add } = useCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const { data: settings } = usePublicSettings(tenantId);
  const qc = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`public-menu-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `tenant_id=eq.${tenantId}` }, () => qc.invalidateQueries({ queryKey: ["public-menu", tenantId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `tenant_id=eq.${tenantId}` }, () => qc.invalidateQueries({ queryKey: ["public-menu", tenantId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "settings", filter: `tenant_id=eq.${tenantId}` }, () => qc.invalidateQueries({ queryKey: ["public-settings", tenantId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, qc]);

  const menu = useQuery({
    queryKey: ["public-menu", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_menu", { _tenant_id: tenantId! } as any);
      if (error) throw error;
      const payload = (data ?? { categories: [], products: [] }) as any;
      return {
        categories: (payload.categories ?? []) as any[],
        products: (payload.products ?? []) as any[],
      };
    },
  });


  const categories = { data: menu.data?.categories ?? [], isLoading: menu.isLoading };
  const products = { data: menu.data?.products ?? [], isLoading: menu.isLoading };


  const filtered = useMemo(() => {
    let list = products.data ?? [];
    if (cat) list = list.filter((p) => p.category_id === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(s) || (p.descricao ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [products.data, cat, q]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const k = p.category_id ?? "outros";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [filtered]);

  const heroMode = settings?.design.hero_mode ?? "banner";
  const carrossel = heroMode === "carousel" ? (settings?.design.carrossel ?? []).filter((b) => b.ativo && b.image_url) : [];
  const bannerUrl = heroMode === "banner" ? (settings?.design.banner_url ?? null) : null;
  const galeria = settings?.design.galeria ?? [];
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (notFound) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Cardápio não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">O endereço <span className="font-mono">/cardapio/{slug}</span> não pertence a nenhuma loja.</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>Voltar para início</Button>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">Carregando cardápio...</div>
    );
  }

  return (
    <PublicLayout>
      {carrossel.length > 0 ? (
        <Carousel items={carrossel} />
      ) : bannerUrl ? (
        <a href="#cardapio" className="block">
          <div className="mx-auto max-w-6xl px-4 pt-4">
            <img src={bannerUrl} alt="Banner" className="aspect-[16/6] w-full rounded-xl object-cover" />
          </div>
        </a>
      ) : (
        <section className="bg-gradient-warm text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
            <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30">Estabelecimento</Badge>
            <h1 className="font-display text-4xl font-bold md:text-6xl">{settings?.nome ?? ""}</h1>
            {settings?.descricao && (
              <p className="mt-3 max-w-xl text-base text-white/90 md:text-lg">{settings.descricao}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/90">
              {settings?.endereco && (
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{settings.endereco}</span>
              )}
              {settings?.telefone && (
                <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{settings.telefone}</span>
              )}
            </div>
          </div>
        </section>
      )}

      <div id="cardapio" className="sticky top-[57px] z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cardápio..." className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${cat === null ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent/40"}`}
            >
              Tudo
            </button>
            {(categories.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent/40"}`}
              >
                <CategoryIcon name={c.icone} className="h-4 w-4" />
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {(categories.data ?? [])
          .filter((c) => !cat || c.id === cat)
          .map((c) => {
            const list = byCategory.get(c.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={c.id} className="mb-10">
                <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold"><CategoryIcon name={c.icone} className="h-6 w-6" />{c.nome}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => {
                    const preco = p.preco_promo ?? p.preco;
                    return (
                      <article key={p.id} className="group flex gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elevated">
                        <ProductImage src={p.imagem_url} alt={p.nome} className="h-24 w-24 shrink-0 rounded-lg" />
                        <div className="flex flex-1 flex-col">
                          <h3 className="font-semibold leading-tight">{p.nome}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
                          <div className="mt-auto flex items-end justify-between pt-2">
                            <div>
                              {p.preco_promo && (
                                <div className="text-xs text-muted-foreground line-through">{fmtMoney(p.preco)}</div>
                              )}
                              <div className="font-display text-lg font-bold text-primary">{fmtMoney(preco)}</div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                add({ product_id: p.id, nome: p.nome, preco: Number(preco), imagem_url: p.imagem_url ?? undefined });
                                toast.success(`${p.nome} adicionado`);
                              }}
                            >
                              <Plus className="h-4 w-4" /> Adicionar
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        {filtered.length === 0 && !products.isLoading && (
          <p className="py-20 text-center text-muted-foreground">Nenhum item encontrado.</p>
        )}

        {galeria.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-2xl font-bold">Galeria</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {galeria.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setLightbox(url)}
                  className="aspect-square overflow-hidden rounded-lg border border-border bg-muted transition hover:opacity-90"
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Fechar">
            <XIcon className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="Ampliada" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </PublicLayout>
  );
}

function Carousel({ items }: { items: { id: string; image_url: string; titulo?: string; descricao?: string; link?: string }[] }) {
  const [idx, setIdx] = useState(0);
  const n = items.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);

  const go = (d: number) => setIdx((i) => (i + d + n) % n);
  const item = items[idx];
  const content = (
    <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl bg-muted">
      <img src={item.image_url} alt={item.titulo || "Banner"} className="h-full w-full object-cover" />
      {(item.titulo || item.descricao) && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
          {item.titulo && <h2 className="font-display text-2xl font-bold md:text-4xl">{item.titulo}</h2>}
          {item.descricao && <p className="mt-1 max-w-xl text-sm text-white/90 md:text-base">{item.descricao}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="relative">
        {item.link ? <a href={item.link}>{content}</a> : content}
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Próximo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Ir para ${i + 1}`}
                  className={cn("h-2 rounded-full transition-all", i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75")}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
