import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Splash } from "@/components/admin/Splash";
import {
  Store,
  ArrowRight,
  LogIn,
  ShoppingCart,
  Utensils,
  Truck,
  Boxes,
  BarChart3,
  CreditCard,
  QrCode,
  Users,
  Check,
  LayoutDashboard,
  Wallet,
  ClipboardList,
  Package,
  Building2,
  FileBarChart,
  Settings2,
  ShieldCheck,
  Smartphone,
  Zap,
  MousePointerClick,
  RefreshCw,
  Download,
  UserPlus,
  Cog,
  PackagePlus,
  Bell,
  TrendingUp,
} from "lucide-react";
import dashboardShot from "@/assets/landing/dashboard.png.asset.json";
import pdvShot from "@/assets/landing/pdv.png.asset.json";
import mesasShot from "@/assets/landing/mesas.png.asset.json";
import caixaShot from "@/assets/landing/caixa.png.asset.json";
import pedidosShot from "@/assets/landing/pedidos.png.asset.json";
import catalogoShot from "@/assets/landing/catalogo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaborSys — Sistema de gestão para restaurantes, padarias e lanchonetes" },
      { name: "description", content: "Sistema completo de gestão para o setor alimentício: PDV, caixa, pedidos, cardápio digital, mesas, estoque e financeiro. Teste grátis por 7 dias." },
      { property: "og:title", content: "SaborSys — Gestão profissional para o setor alimentício" },
      { property: "og:description", content: "PDV, caixa, pedidos, cardápio digital, mesas, estoque e financeiro em uma única plataforma. Teste grátis por 7 dias, sem cartão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Landing,
});

const MODULES = [
  { icon: LayoutDashboard, title: "Dashboard", desc: "Visão geral do negócio com indicadores em tempo real." },
  { icon: ShoppingCart, title: "PDV", desc: "Frente de caixa ágil, com busca, categorias e atalhos." },
  { icon: Wallet, title: "Caixa", desc: "Abertura, sangria, suprimento e fechamento com conferência." },
  { icon: ClipboardList, title: "Pedidos", desc: "Acompanhe pedidos por status, mesa e entrega." },
  { icon: QrCode, title: "Cardápio Digital", desc: "Link e QR Code exclusivos do seu estabelecimento." },
  { icon: Package, title: "Produtos", desc: "Cadastro completo com imagens, categorias e variações." },
  { icon: Users, title: "Clientes", desc: "Histórico, contatos e endereços organizados." },
  { icon: CreditCard, title: "Financeiro", desc: "Movimentações, formas de pagamento e relatórios." },
  { icon: Utensils, title: "Controle de Mesas", desc: "Mapa do salão em tempo real, com status e comandas." },
  { icon: FileBarChart, title: "Relatórios", desc: "Vendas, produtos e desempenho em relatórios claros." },
  { icon: Settings2, title: "Configurações", desc: "Central com todas as opções da sua operação." },
  { icon: Building2, title: "Multiempresa", desc: "Gerencie unidades e usuários com controle de acesso." },
];

const BENEFITS = [
  { icon: MousePointerClick, title: "Fácil utilização", desc: "Interface pensada para o dia a dia da operação." },
  { icon: Zap, title: "Alto desempenho", desc: "Respostas rápidas mesmo em horários de pico." },
  { icon: RefreshCw, title: "Tempo real", desc: "Pedidos, caixa e mesas sincronizados instantaneamente." },
  { icon: ShieldCheck, title: "Segurança", desc: "Dados isolados por empresa e backups automáticos." },
  { icon: Smartphone, title: "Multidispositivo", desc: "Funciona em computador, tablet e celular." },
  { icon: Download, title: "Instalável (PWA)", desc: "Use como aplicativo, direto do navegador." },
];

const STEPS = [
  { icon: UserPlus, title: "Crie sua conta", desc: "Cadastro rápido em poucos minutos." },
  { icon: Zap, title: "Inicie o teste grátis", desc: "7 dias com acesso completo à plataforma." },
  { icon: Cog, title: "Configure a empresa", desc: "Dados, identidade visual e preferências." },
  { icon: PackagePlus, title: "Cadastre produtos", desc: "Categorias, imagens e valores." },
  { icon: Bell, title: "Receba pedidos", desc: "Salão, delivery, balcão e cardápio digital." },
  { icon: TrendingUp, title: "Gerencie o negócio", desc: "Acompanhe indicadores e evolua a operação." },
];

const SEGMENTS = [
  "Restaurantes", "Pizzarias", "Hamburguerias", "Padarias", "Cafeterias",
  "Sorveterias", "Açaíterias", "Food Trucks", "Bares", "Lanchonetes",
];

const FAQ = [
  { q: "Como funciona o teste gratuito?", a: "Você cria uma conta e passa a ter acesso completo ao sistema por 7 dias, sem custo." },
  { q: "Preciso cadastrar cartão de crédito?", a: "Não. O teste é 100% livre e não solicitamos nenhum dado de pagamento no cadastro." },
  { q: "Posso cancelar quando quiser?", a: "Sim. A qualquer momento, sem multas, taxas ou burocracia." },
  { q: "Funciona no celular e no tablet?", a: "Sim. O sistema é totalmente responsivo e pode ser instalado como aplicativo (PWA)." },
  { q: "Posso utilizar em vários dispositivos ao mesmo tempo?", a: "Sim. Você pode operar caixa, salão e entrega simultaneamente em dispositivos diferentes." },
  { q: "Como funciona a segurança dos dados?", a: "Utilizamos criptografia, isolamento por empresa e rotinas de backup automáticas." },
];

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          const userId = data.session.user.id;
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          const isMaster = roles?.some((r: any) => r.role === "master");
          navigate({ to: isMaster ? "/master" : "/admin", replace: true });
          return;
        }
      } catch {}
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (checking) return <Splash label="Carregando..." />;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">SaborSys</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#demonstracao" className="hover:text-foreground">Demonstração</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#segmentos" className="hover:text-foreground">Segmentos</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth"><LogIn className="mr-1 h-4 w-4" /> Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Começar teste grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.05fr_1fr] md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Check className="h-3 w-3 text-primary" /> 7 dias grátis · sem cartão de crédito
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Gestão profissional para o seu estabelecimento alimentício
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
              PDV, caixa, pedidos, cardápio digital, mesas, estoque e financeiro reunidos em uma plataforma clara, estável e feita para operar todos os dias.
            </p>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Organize sua operação, atenda com agilidade e acompanhe o desempenho do seu negócio em tempo real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Começar teste grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#recursos">Conhecer recursos</a>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Acesso completo no teste</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Cancele quando quiser</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Suporte incluído</span>
            </div>
          </div>

          {/* Visual do sistema */}
          <SystemPreview />
        </div>
      </section>

      {/* Institucional */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Um sistema pensado para quem vive a operação</h2>
              <p className="mt-4 text-muted-foreground">
                O SaborSys é a plataforma de gestão completa para restaurantes, lanchonetes, padarias, cafeterias e demais estabelecimentos do setor alimentício. Reúne em um só lugar tudo o que sua equipe precisa para atender, controlar o caixa, organizar produtos e acompanhar resultados.
              </p>
              <p className="mt-3 text-muted-foreground">
                Uma interface direta e organizada, com fluxos rápidos, feita para reduzir erros e liberar tempo para o que importa: o cliente.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Interface clara e organizada",
                "Fluxos otimizados de atendimento",
                "Sincronização em tempo real",
                "Isolamento de dados por empresa",
                "Atualizações contínuas incluídas",
                "Suporte oficial da plataforma",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Destaque teste gratuito */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <Card className="border-primary/30 bg-card p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Teste grátis
              </span>
              <h3 className="mt-3 font-display text-2xl font-bold md:text-3xl">7 dias com acesso completo, sem cartão de crédito</h3>
              <p className="mt-2 text-muted-foreground">Cadastro rápido, ativação imediata e liberdade para cancelar quando quiser.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Recursos / Módulos */}
      <section id="recursos" className="border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Todos os módulos que sua operação precisa</h2>
            <p className="mt-3 text-muted-foreground">Um único sistema para atender, controlar, organizar e acompanhar o seu negócio.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <Card key={m.title} className="p-5 transition-colors hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração */}
      <section id="demonstracao" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Conheça algumas telas do sistema</h2>
          <p className="mt-3 text-muted-foreground">Demonstrações fiéis à experiência que você encontra após o login.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <DemoCard title="Dashboard" desc="Indicadores em tempo real do seu dia."><MockDashboard /></DemoCard>
          <DemoCard title="PDV" desc="Frente de caixa ágil e organizada."><MockPDV /></DemoCard>
          <DemoCard title="Controle de Mesas" desc="Mapa do salão com status atualizado."><MockMesas /></DemoCard>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">Comece a usar em poucos passos.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefícios */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Benefícios reais para o seu dia a dia</h2>
          <p className="mt-3 text-muted-foreground">Ganhos práticos que a equipe percebe desde o primeiro dia de uso.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Segmentos */}
      <section id="segmentos" className="border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Segmentos atendidos</h2>
            <p className="mt-3 text-muted-foreground">Ideal para estabelecimentos do setor alimentício de qualquer porte.</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {SEGMENTS.map((s) => (
              <span key={s} className="rounded-full border border-border bg-card px-4 py-2 text-sm">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Destaque teste gratuito 2 */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <Card className="p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="font-display text-2xl font-bold md:text-3xl">Experimente a plataforma sem compromisso</h3>
              <p className="mt-2 text-muted-foreground">7 dias grátis com acesso completo. Sem cartão. Sem burocracia.</p>
            </div>
            <Button asChild size="lg">
              <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Perguntas frequentes</h2>
          <p className="mt-3 text-muted-foreground">Tire dúvidas comuns sobre o teste gratuito e o uso da plataforma.</p>
        </div>
        <div className="mt-8 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-lg border border-border bg-card p-4 open:bg-muted/30">
              <summary className="cursor-pointer list-none font-medium">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Pronto para organizar a sua operação?</h2>
          <p className="mt-3 text-muted-foreground">Comece hoje o seu teste gratuito de 7 dias — ativação imediata, sem cartão de crédito.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold">SaborSys</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Sistema de gestão para o setor alimentício.</p>
          </div>
          <FooterCol title="Plataforma" items={[
            { label: "Sobre", href: "#" },
            { label: "Recursos", href: "#recursos" },
            { label: "Atualizações", href: "#" },
          ]} />
          <FooterCol title="Suporte" items={[
            { label: "Central de Ajuda", href: "#" },
            { label: "Contato", href: "#" },
            { label: "WhatsApp", href: "#" },
          ]} />
          <FooterCol title="Empresa" items={[
            { label: "Política de Privacidade", href: "#" },
            { label: "Termos de Uso", href: "#" },
          ]} />
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row">
            <span>© {new Date().getFullYear()} SaborSys — Todos os direitos reservados</span>
            <span>Versão 1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.label}><a href={i.href} className="hover:text-foreground">{i.label}</a></li>
        ))}
      </ul>
    </div>
  );
}

function DemoCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
      <div className="p-4">{children}</div>
      <div className="border-t border-border px-4 py-3">
        <div className="font-display text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

/* ---------- Visual mockups built with the app's own design tokens ---------- */

function SystemPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <span className="text-[10px] text-muted-foreground">app.saborsys · Dashboard</span>
          <span className="w-8" />
        </div>
        <MockDashboard />
      </div>
    </div>
  );
}

function MockDashboard() {
  const kpis = [
    { label: "Vendas hoje", value: "R$ 4.820", icon: TrendingUp },
    { label: "Pedidos", value: "128", icon: ClipboardList },
    { label: "Ticket médio", value: "R$ 37,65", icon: Wallet },
    { label: "Mesas ativas", value: "9/14", icon: Utensils },
  ];
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 p-3 text-xs">
      <aside className="rounded-lg border border-border bg-muted/20 p-2">
        {[LayoutDashboard, ShoppingCart, Wallet, ClipboardList, Utensils, Package, FileBarChart, Settings2].map((I, i) => (
          <div key={i} className={`mb-1 flex items-center gap-2 rounded px-2 py-1.5 ${i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <I className="h-3.5 w-3.5" />
            <span className="h-1.5 w-14 rounded bg-current opacity-40" />
          </div>
        ))}
      </aside>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-border p-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">{k.label}</span>
                <k.icon className="h-3 w-3" />
              </div>
              <div className="mt-1 font-display text-sm font-bold">{k.value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Vendas nos últimos 7 dias</span>
            <span>+12%</span>
          </div>
          <div className="flex h-16 items-end gap-1.5">
            {[35, 55, 40, 70, 50, 85, 65].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockPDV() {
  const items = [
    { n: "Pão Francês", p: "R$ 0,90" },
    { n: "Café Expresso", p: "R$ 5,50" },
    { n: "Coxinha", p: "R$ 7,00" },
    { n: "Pão de Queijo", p: "R$ 4,00" },
    { n: "Suco Natural", p: "R$ 8,00" },
    { n: "Bolo Fatia", p: "R$ 6,50" },
  ];
  return (
    <div className="grid grid-cols-[1fr_100px] gap-2 text-xs">
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.n} className="rounded-lg border border-border p-2">
            <div className="mb-1 aspect-square rounded bg-muted/50" />
            <div className="truncate text-[10px] font-medium">{it.n}</div>
            <div className="text-[10px] text-primary">{it.p}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-2">
        <div className="mb-1 text-[10px] font-semibold">Comanda</div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-1 flex items-center justify-between text-[10px]">
            <span className="truncate">Item {i}</span>
            <span className="text-muted-foreground">R$ 6,00</span>
          </div>
        ))}
        <div className="mt-2 border-t border-border pt-2 text-[10px]">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>R$ 18,00</span></div>
          <div className="mt-1 flex justify-between font-semibold"><span>Total</span><span>R$ 18,00</span></div>
        </div>
        <div className="mt-2 rounded bg-primary py-1 text-center text-[10px] font-semibold text-primary-foreground">Finalizar</div>
      </div>
    </div>
  );
}

function MockMesas() {
  const mesas = Array.from({ length: 12 }, (_, i) => ({
    n: i + 1,
    s: i % 3 === 0 ? "ocupada" : i % 4 === 0 ? "reservada" : "livre",
  }));
  const color = (s: string) =>
    s === "ocupada" ? "border-primary/40 bg-primary/10 text-primary"
    : s === "reservada" ? "border-border bg-muted/40 text-muted-foreground"
    : "border-border bg-card text-foreground";
  return (
    <div className="grid grid-cols-4 gap-2 text-xs">
      {mesas.map((m) => (
        <div key={m.n} className={`rounded-lg border p-2 text-center ${color(m.s)}`}>
          <div className="font-display text-sm font-bold">M{m.n}</div>
          <div className="mt-0.5 text-[9px] capitalize">{m.s}</div>
        </div>
      ))}
    </div>
  );
}
