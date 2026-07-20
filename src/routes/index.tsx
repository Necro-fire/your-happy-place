import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Store,
  ArrowRight,
  Sparkles,
  LogIn,
  ShoppingCart,
  Utensils,
  BarChart3,
  Package,
  CreditCard,
  Smartphone,
  Zap,
  Shield,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaborSys — Sistema de gestão para bares, restaurantes e lanchonetes" },
      { name: "description", content: "Plataforma SaaS completa: PDV, cardápio digital, delivery, mesas, estoque e financeiro. Teste grátis por 7 dias." },
      { property: "og:title", content: "SaborSys — Gestão inteligente para o seu negócio" },
      { property: "og:description", content: "PDV, cardápio digital, delivery, mesas, estoque e financeiro em uma única plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ShoppingCart, title: "PDV Profissional", desc: "Frente de caixa completa com pagamentos, descontos e comandas." },
  { icon: Utensils, title: "Cardápio Digital", desc: "Cada empresa com sua URL exclusiva e visual personalizado." },
  { icon: Smartphone, title: "Delivery & Mesas", desc: "Pedidos por QR Code, comandas de mesa e integração com entrega." },
  { icon: Package, title: "Estoque em Tempo Real", desc: "Baixa automática por venda e alerta de níveis mínimos." },
  { icon: BarChart3, title: "Relatórios e KDS", desc: "Dashboard, painel de produção (KDS) e histórico completo." },
  { icon: CreditCard, title: "Financeiro Integrado", desc: "Controle de caixa, formas de pagamento e conciliação diária." },
];

const benefits = [
  "Setup em minutos — sem instalação",
  "Atualizações em tempo real em todas as telas",
  "Multiempresa com isolamento total de dados",
  "Suporte oficial dentro da plataforma",
];

const plans = [
  {
    nome: "Teste Grátis",
    preco: "R$ 0",
    periodo: "7 dias",
    destaque: false,
    itens: ["Todos os módulos liberados", "Cardápio digital exclusivo", "Suporte por chat"],
    cta: "Começar teste",
  },
  {
    nome: "Profissional",
    preco: "R$ 99",
    periodo: "por mês",
    destaque: true,
    itens: ["PDV + Cardápio + Mesas + Delivery", "Estoque e Financeiro", "Suporte prioritário", "Atualizações em tempo real"],
    cta: "Assinar agora",
  },
  {
    nome: "Enterprise",
    preco: "Sob consulta",
    periodo: "personalizado",
    destaque: false,
    itens: ["Multi-lojas / filiais", "Integrações dedicadas", "SLA e onboarding", "Gerente de conta"],
    cta: "Falar com vendas",
  },
];

const faqs = [
  { q: "Preciso instalar algo?", a: "Não. O SaborSys roda 100% no navegador, em qualquer dispositivo (computador, tablet ou celular)." },
  { q: "Como funciona o cardápio digital?", a: "Cada empresa recebe um endereço público exclusivo (ex.: /cardapio/sua-empresa) para compartilhar com clientes por link ou QR Code." },
  { q: "Posso testar antes de pagar?", a: "Sim. Você tem 7 dias grátis com todos os módulos liberados, sem precisar de cartão de crédito." },
  { q: "Meus dados ficam seguros?", a: "Sim. Cada empresa tem isolamento total de dados, backups automáticos e conexão criptografada." },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold">SaborSys</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth"><LogIn className="mr-1 h-4 w-4" /> Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Plataforma SaaS de gestão
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold leading-tight md:text-6xl">
            O sistema completo para o seu negócio de alimentação
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            PDV, cardápio digital exclusivo, mesas, delivery, estoque e financeiro — tudo integrado em uma única plataforma, com atualizações em tempo real.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-elevated">
              <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Teste grátis por 7 dias · Sem cartão de crédito</p>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="border-t border-border py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo o que você precisa em um só lugar</h2>
            <p className="mt-3 text-muted-foreground">Módulos pensados para operar bares, restaurantes, lanchonetes e cafeterias com fluidez.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6 transition hover:shadow-elevated">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Por que escolher o SaborSys</h2>
            <p className="mt-3 text-muted-foreground">
              Uma plataforma moderna, rápida e projetada para escalar com o seu negócio — do primeiro pedido às múltiplas unidades.
            </p>
            <ul className="mt-6 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <Zap className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Rápido</h3>
              <p className="mt-1 text-sm text-muted-foreground">Interface fluida, sem recarregamentos, com sincronização instantânea.</p>
            </Card>
            <Card className="p-6">
              <Shield className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Seguro</h3>
              <p className="mt-1 text-sm text-muted-foreground">Dados isolados por empresa, políticas de acesso e criptografia.</p>
            </Card>
            <Card className="p-6 sm:col-span-2">
              <Smartphone className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Multi-dispositivo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Funciona em computador, tablet ou celular — sem instalação.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="border-t border-border py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Planos para cada tamanho de operação</h2>
            <p className="mt-3 text-muted-foreground">Comece grátis e escolha o plano que faz sentido quando estiver pronto.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <Card
                key={p.nome}
                className={`flex flex-col p-6 ${p.destaque ? "border-primary shadow-elevated ring-2 ring-primary/20" : ""}`}
              >
                {p.destaque && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{p.nome}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">{p.preco}</span>
                  <span className="text-sm text-muted-foreground">/ {p.periodo}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.itens.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full" variant={p.destaque ? "default" : "outline"}>
                  <Link to="/auth">{p.cta}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
            <p className="mt-3 text-muted-foreground">Tudo o que você precisa saber antes de começar.</p>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-lg border border-border bg-card p-5 open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {f.q}
                  <span className="ml-4 text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Pronto para modernizar a sua operação?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Crie sua conta em minutos e teste todos os módulos gratuitamente por 7 dias.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-elevated">
              <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Store className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">SaborSys</span>
          </div>
          <span>© {new Date().getFullYear()} SaborSys — Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
}
