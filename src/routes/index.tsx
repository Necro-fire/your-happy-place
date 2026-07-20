import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Store, ArrowRight, Sparkles, LogIn } from "lucide-react";
import { toast } from "sonner";
import { loadTenantByCodigo, loadTenantBySlug } from "@/lib/tenant-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaborSys — Gestão inteligente para o seu negócio" },
      { name: "description", content: "Cardápio digital, PDV, delivery e mesas em um único sistema. Encontre o cardápio da sua loja preferida pelo código de acesso." },
      { property: "og:title", content: "SaborSys — Plataforma de gestão" },
      { property: "og:description", content: "Cardápio digital, PDV, delivery e mesas em um único sistema." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    const raw = codigo.trim();
    if (raw.length < 2) return toast.error("Informe o endereço ou código da loja");
    setLoading(true);
    // Slug-friendly: lowercase alphanumeric with hyphens
    const looksLikeSlug = /^[a-z0-9-]+$/i.test(raw) && /[a-z-]/i.test(raw);
    let t = looksLikeSlug ? await loadTenantBySlug(raw.toLowerCase()) : null;
    if (!t) t = await loadTenantByCodigo(raw.toUpperCase());
    setLoading(false);
    if (!t) return toast.error("Loja não encontrada");
    if (t.slug) navigate({ to: "/cardapio/$slug", params: { slug: t.slug } });
    else navigate({ to: "/menu/$codigo", params: { codigo: t.codigo } });
  }


  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-background to-primary/5">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">SaborSys</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth"><LogIn className="mr-1 h-4 w-4" /> Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:py-20">
        <section className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Plataforma SaaS de gestão
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
            O sistema completo para o seu negócio de alimentação
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Cardápio digital exclusivo, PDV, mesas, delivery, estoque e financeiro — tudo integrado em uma única plataforma.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já sou cliente</Link>
            </Button>
          </div>
        </section>

        <section className="flex items-center">
          <Card className="w-full space-y-4 p-6 shadow-elevated">
            <div>
              <h2 className="font-display text-xl font-bold">Acesse um cardápio</h2>
              <p className="text-sm text-muted-foreground">
                Informe o endereço amigável da loja para abrir o cardápio digital.
              </p>
            </div>
            <form onSubmit={enter} className="space-y-3">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex.: minha-padaria"
                maxLength={64}
                className="text-center font-mono text-base"
                autoFocus
              />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Buscando..." : "Abrir cardápio"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              O endereço da loja é único e informado pelo estabelecimento.
            </p>
          </Card>
        </section>

      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SaborSys — Todos os direitos reservados
      </footer>
    </div>
  );
}
