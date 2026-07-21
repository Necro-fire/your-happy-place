import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Splash } from "@/components/admin/Splash";
import {
  Store,
  ArrowRight,
  Sparkles,
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
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaborSys — Gestão inteligente para o seu negócio" },
      { name: "description", content: "Plataforma SaaS completa: cardápio digital, PDV, mesas, delivery, estoque e financeiro em um único sistema." },
      { property: "og:title", content: "SaborSys — Gestão inteligente para o seu negócio" },
      { property: "og:description", content: "Cardápio digital, PDV, mesas, delivery, estoque e financeiro em um único sistema." },
    ],
  }),
  ssr: false,
  component: Landing,
});

const FEATURES = [
  { icon: ShoppingCart, title: "PDV Profissional", desc: "Venda rápido, com atalhos, favoritos e integração de pagamento." },
  { icon: Utensils, title: "Mesas & Comandas", desc: "Controle de salão em tempo real com pedidos por mesa." },
  { icon: Truck, title: "Delivery integrado", desc: "Receba pedidos com endereço, taxa e status do pedido." },
  { icon: QrCode, title: "Cardápio digital", desc: "Link único e QR Code para o seu estabelecimento." },
  { icon: Boxes, title: "Estoque & Compras", desc: "Baixa automática, alertas e movimentações." },
  { icon: BarChart3, title: "Relatórios", desc: "Vendas, caixa, produtos e clientes em dashboards claros." },
];

const BENEFITS = [
  "Sem instalar nada — funciona no navegador",
  "Atualizações automáticas e sincronização em tempo real",
  "Multiplataforma: computador, tablet e celular",
  "Suporte oficial e treinamento incluído",
];

const PLANS = [
  {
    name: "Essencial",
    price: "R$ 79",
    period: "/mês",
    highlight: false,
    features: ["PDV completo", "Cardápio digital", "Até 3 usuários", "Suporte por chat"],
  },
  {
    name: "Plus",
    price: "R$ 149",
    period: "/mês",
    highlight: true,
    features: ["Tudo do Essencial", "Mesas e Delivery", "Usuários ilimitados", "Relatórios avançados", "Suporte prioritário"],
  },
];

const FAQ = [
  { q: "Preciso instalar algum programa?", a: "Não. O SaborSys funciona 100% online em qualquer navegador moderno." },
  { q: "Posso testar antes de assinar?", a: "Sim. Crie sua conta gratuitamente e explore a plataforma sem compromisso." },
  { q: "Meus dados ficam seguros?", a: "Utilizamos criptografia e isolamento por empresa, com backups automáticos." },
  { q: "Funciona em vários dispositivos?", a: "Sim. Use no computador do caixa, tablet do salão e celular do entregador." },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
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
              <Link to="/auth">Teste grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Plataforma SaaS de gestão
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
            O sistema completo para o seu negócio de alimentação
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground md:text-lg">
            Cardápio digital, PDV, mesas, delivery, estoque e financeiro — tudo integrado em uma única plataforma.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sem cartão de crédito · Ative em minutos</p>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo o que seu negócio precisa</h2>
          <p className="mt-3 text-muted-foreground">Ferramentas profissionais desenhadas para operar com agilidade.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Feito para quem vende de verdade</h2>
            <p className="mt-3 text-muted-foreground">Uma plataforma pensada para reduzir cliques, evitar erros e acelerar o atendimento.</p>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: CreditCard, label: "Pagamentos rápidos" },
              { icon: Users, label: "Multiusuário" },
              { icon: QrCode, label: "QR Code exclusivo" },
              { icon: BarChart3, label: "Métricas em tempo real" },
            ].map((it) => (
              <Card key={it.label} className="flex flex-col items-center justify-center p-6 text-center">
                <it.icon className="h-6 w-6 text-primary" />
                <span className="mt-2 text-sm font-medium">{it.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo callout */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-12">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Veja o SaborSys em ação</h2>
              <p className="mt-2 text-muted-foreground">Crie uma conta gratuita e explore o sistema com dados de demonstração já prontos.</p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Plans */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Planos simples e transparentes</h2>
          <p className="mt-3 text-muted-foreground">Escolha o plano ideal — cancele quando quiser.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={`p-8 ${p.highlight ? "border-primary shadow-elevated ring-1 ring-primary/40" : ""}`}
            >
              {p.highlight && (
                <span className="inline-flex rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Mais escolhido
                </span>
              )}
              <h3 className="mt-2 font-display text-2xl font-bold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full" variant={p.highlight ? "default" : "outline"}>
                <Link to="/auth">Começar teste grátis</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
        </div>
        <div className="mt-8 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-lg border border-border bg-card p-4">
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

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Pronto para modernizar seu negócio?</h2>
        <p className="mt-3 text-muted-foreground">Comece agora — ativação em minutos, sem cartão de crédito.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Store className="h-3.5 w-3.5" />
            </div>
            <span>© {new Date().getFullYear()} SaborSys — Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link to="/auth" className="hover:text-foreground">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
