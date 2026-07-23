import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Splash } from "@/components/admin/Splash";
import {
  Store,
  ArrowRight,
  LogIn,
  ShoppingCart,
  Utensils,
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
  CreditCard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  CalendarCheck2,
  CreditCard as CreditCardIcon,
  BadgeCheck as BadgeCheckIcon,
  XCircle,
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

/* ==============================
   Palette (light-only, snow-white)
   ============================== */
const C = {
  snow: "#F8FAFC",         // Snow white background
  snowSoft: "#F1F5F9",     // Section variation
  snowWarm: "#FBF9F5",     // Warm variation
  ink: "#0F172A",          // Primary text
  inkSoft: "#334155",      // Secondary text
  muted: "#64748B",         // Muted
  line: "#E2E8F0",         // Borders
  brand: "#EA580C",        // Accent (aligned with SaborSys brand)
  brandSoft: "#FFF1E6",
  brand2: "#F59E0B",
  cardShadow: "0 10px 30px -12px rgba(15,23,42,0.10), 0 4px 10px -6px rgba(15,23,42,0.06)",
  cardShadowLg: "0 24px 60px -20px rgba(15,23,42,0.18), 0 8px 20px -10px rgba(15,23,42,0.08)",
};

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
    <div
      className="landing-root min-h-dvh font-sans"
      style={{
        background: C.snow,
        color: C.ink,
        colorScheme: "light",
      }}
    >
      {/* Scoped styles: light theme, animations, floaters */}
      <style>{`
        .landing-root { --ring: ${C.brand}; }
        .landing-root ::selection { background: ${C.brand}; color: #fff; }

        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-float {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50%      { transform: translateY(-14px) rotate(var(--r, 0deg)); }
        }
        @keyframes lp-drift {
          0%, 100% { transform: translate(0,0) rotate(0deg); }
          50%      { transform: translate(10px,-8px) rotate(3deg); }
        }
        .lp-reveal { opacity: 0; }
        .lp-reveal.is-in { animation: lp-fade-up .7s ease-out forwards; }
        .lp-float { animation: lp-float 7s ease-in-out infinite; }
        .lp-drift { animation: lp-drift 9s ease-in-out infinite; }
        .lp-card {
          background: #fff;
          border: 1px solid ${C.line};
          border-radius: 18px;
          box-shadow: ${C.cardShadow};
          transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
        }
        .lp-card:hover {
          transform: translateY(-3px);
          box-shadow: ${C.cardShadowLg};
          border-color: rgba(234,88,12,0.35);
        }
        .lp-chip {
          display: inline-flex; align-items: center; gap: .5rem;
          padding: .35rem .8rem; border-radius: 999px;
          background: ${C.brandSoft}; color: ${C.brand};
          font-size: 12px; font-weight: 600;
          border: 1px solid rgba(234,88,12,.18);
        }
        .lp-btn-primary {
          background: linear-gradient(135deg, ${C.brand}, #F97316);
          color: #fff; border: 0;
          box-shadow: 0 10px 24px -10px rgba(234,88,12,.55);
        }
        .lp-btn-primary:hover { filter: brightness(1.03); transform: translateY(-1px); }
        .lp-btn-ghost {
          background: #fff; color: ${C.ink};
          border: 1px solid ${C.line};
        }
        .lp-btn-ghost:hover { background: ${C.snowSoft}; }
        .lp-3d-tile {
          background: linear-gradient(160deg,#fff, ${C.snowSoft});
          border: 1px solid ${C.line};
          box-shadow: inset 0 1px 0 #fff, ${C.cardShadow};
        }
        .lp-glow {
          position: absolute; pointer-events: none; border-radius: 9999px;
          filter: blur(60px); opacity: .55;
        }
        .lp-mockup {
          border-radius: 16px; overflow: hidden; background:#fff;
          border: 1px solid ${C.line};
          box-shadow: ${C.cardShadowLg};
        }
        .lp-mockup-bar {
          display:flex; align-items:center; justify-content:space-between;
          padding: 10px 14px; border-bottom: 1px solid ${C.line};
          background: linear-gradient(180deg,#fff, ${C.snowSoft});
          font-size: 11px; color: ${C.muted};
        }
        .lp-dot { width: 10px; height: 10px; border-radius: 999px; display:inline-block; }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(248,250,252,0.85)",
          backdropFilter: "saturate(140%) blur(10px)",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="grid h-9 w-9 place-items-center rounded-xl text-white"
              style={{ background: `linear-gradient(135deg, ${C.brand}, #F97316)`, boxShadow: "0 8px 20px -8px rgba(234,88,12,.5)" }}
            >
              <Store className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight" style={{ color: C.ink }}>SaborSys</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex" style={{ color: C.inkSoft }}>
            <a href="#recursos" className="hover:text-[color:var(--ring)]">Recursos</a>
            <a href="#demonstracao" className="hover:text-[color:var(--ring)]">Demonstração</a>
            <a href="#como-funciona" className="hover:text-[color:var(--ring)]">Como funciona</a>
            <a href="#segmentos" className="hover:text-[color:var(--ring)]">Segmentos</a>
            <a href="#faq" className="hover:text-[color:var(--ring)]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="lp-btn-ghost">
              <Link to="/auth"><LogIn className="mr-1 h-4 w-4" /> Entrar</Link>
            </Button>
            <Button asChild size="sm" className="lp-btn-primary">
              <Link to="/auth">Teste grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(1200px 500px at 85% -10%, ${C.brandSoft} 0%, transparent 60%), ${C.snow}`,
        }}
      >
        {/* floating 3D shapes */}
        <div className="lp-glow" style={{ background: C.brand, width: 380, height: 380, top: -120, right: -80 }} />
        <div className="lp-glow" style={{ background: "#FBBF24", width: 260, height: 260, top: 240, left: -80, opacity: .35 }} />
        <div className="pointer-events-none absolute right-[6%] top-24 hidden md:block">
          <Cube3D size={72} color={C.brand} r="-14deg" />
        </div>
        <div className="pointer-events-none absolute left-[8%] bottom-16 hidden md:block">
          <Sphere3D size={56} />
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1.05fr_1fr] md:items-center md:py-28">
          <Reveal>
            <span className="lp-chip">
              <Sparkles className="h-3.5 w-3.5" /> 7 dias grátis · sem cartão de crédito
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl" style={{ color: C.ink }}>
              Gestão profissional para o seu <span style={{ background: `linear-gradient(135deg, ${C.brand}, #F97316)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>estabelecimento alimentício</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg" style={{ color: C.inkSoft }}>
              PDV, caixa, pedidos, cardápio digital, mesas, estoque e financeiro reunidos em uma plataforma clara, estável e feita para operar todos os dias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="lp-btn-primary">
                <Link to="/auth">Começar teste grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" className="lp-btn-ghost">
                <a href="#demonstracao">Ver o sistema</a>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs" style={{ color: C.muted }}>
              <BadgeCheck>Acesso completo no teste</BadgeCheck>
              <BadgeCheck>Cancele quando quiser</BadgeCheck>
              <BadgeCheck>Suporte incluído</BadgeCheck>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <LaptopMockup src={dashboardShot.url} label="Dashboard" />
          </Reveal>
        </div>

        <WaveDivider from={C.snow} to={C.snowSoft} />
      </section>

      {/* ========== TRUST STRIP ========== */}
      <TrustStrip />

      {/* ========== INSTITUCIONAL ========== */}

      <section style={{ background: C.snowSoft }} className="relative">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <Reveal>
              <span className="lp-chip">Sobre a plataforma</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Um sistema pensado para quem vive a operação
              </h2>
              <p className="mt-4" style={{ color: C.inkSoft }}>
                O SaborSys é a plataforma de gestão completa para restaurantes, lanchonetes, padarias, cafeterias e demais estabelecimentos do setor alimentício. Reúne em um só lugar tudo o que sua equipe precisa para atender, controlar o caixa, organizar produtos e acompanhar resultados.
              </p>
              <p className="mt-3" style={{ color: C.inkSoft }}>
                Interface direta, fluxos rápidos e visual moderno — feita para reduzir erros e liberar tempo para o que importa: o cliente.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "Interface clara e organizada",
                  "Fluxos otimizados de atendimento",
                  "Sincronização em tempo real",
                  "Isolamento de dados por empresa",
                  "Atualizações contínuas incluídas",
                  "Suporte oficial da plataforma",
                ].map((b) => (
                  <li key={b} className="lp-card flex items-start gap-3 p-4">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: C.brandSoft, color: C.brand }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm" style={{ color: C.ink }}>{b}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
        <WaveDivider from={C.snowSoft} to={C.snow} flip />
      </section>

      {/* ========== RECURSOS / MÓDULOS ========== */}
      <section id="recursos" className="relative" style={{ background: C.snow }}>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="lp-chip">Módulos</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Todos os módulos que sua operação precisa
              </h2>
              <p className="mt-3" style={{ color: C.inkSoft }}>
                Um único sistema para atender, controlar, organizar e acompanhar o seu negócio.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <Reveal key={m.title} delay={i * 50}>
                <div className="lp-card p-6 h-full">
                  <div className="lp-3d-tile grid h-12 w-12 place-items-center rounded-xl" style={{ color: C.brand }}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold" style={{ color: C.ink }}>{m.title}</h3>
                  <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <WaveDivider from={C.snow} to={C.snowWarm} />
      </section>

      {/* ========== DEMONSTRAÇÃO — mockups reais ========== */}
      <section id="demonstracao" className="relative" style={{ background: C.snowWarm }}>
        <div className="pointer-events-none absolute right-[6%] top-24 hidden lg:block">
          <Cube3D size={54} color={C.brand2} r="18deg" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="lp-chip">Demonstração real</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Conheça algumas telas do sistema
              </h2>
              <p className="mt-3" style={{ color: C.inkSoft }}>
                Capturas reais da plataforma — a mesma experiência que você encontra após o login.
              </p>
            </div>
          </Reveal>

          {/* Smart carousel */}
          <div className="mt-12">
            <SmartCarousel
              slides={[
                { src: dashboardShot.url, label: "Dashboard", desc: "Indicadores em tempo real do seu negócio." },
                { src: pdvShot.url, label: "PDV", desc: "Frente de caixa ágil, com categorias e comanda." },
                { src: mesasShot.url, label: "Controle de Mesas", desc: "Mapa do salão integrado ao PDV." },
                { src: caixaShot.url, label: "Caixa", desc: "Abertura, movimentações e fechamento com conferência." },
                { src: pedidosShot.url, label: "Pedidos", desc: "Acompanhe pedidos por status, mesa e entrega." },
                { src: catalogoShot.url, label: "Produtos", desc: "Cadastro completo do seu catálogo." },
              ]}
            />
          </div>

          {/* Device mockups */}
          <div className="mt-16 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <Reveal><LaptopMockup src={pdvShot.url} label="PDV · Frente de caixa" /></Reveal>
            <Reveal delay={120}><TabletMockup src={mesasShot.url} label="Controle de Mesas" /></Reveal>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:items-center">
            <Reveal><PhoneMockup src={pedidosShot.url} label="Pedidos" /></Reveal>
            <Reveal delay={120}><LaptopMockup src={caixaShot.url} label="Caixa" /></Reveal>
          </div>

        </div>
        <WaveDivider from={C.snowWarm} to={C.snow} flip />
      </section>

      {/* ========== DESTAQUE TESTE GRÁTIS ========== */}
      <section className="relative" style={{ background: C.snow }}>
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-3xl p-8 md:p-12"
              style={{
                background: `linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)`,
                border: `1px solid ${C.line}`,
                boxShadow: C.cardShadowLg,
              }}
            >
              <div className="lp-glow" style={{ background: C.brand, width: 260, height: 260, top: -80, right: -60 }} />
              <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <span className="lp-chip">Teste grátis</span>
                  <h3 className="mt-3 font-display text-2xl font-bold md:text-3xl" style={{ color: C.ink }}>
                    7 dias com acesso completo, sem cartão de crédito
                  </h3>
                  <p className="mt-2" style={{ color: C.inkSoft }}>
                    Cadastro rápido, ativação imediata e liberdade para cancelar quando quiser.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="lp-btn-primary">
                    <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" className="lp-btn-ghost">
                    <Link to="/auth">Entrar</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========== COMO FUNCIONA ========== */}
      <section id="como-funciona" className="relative" style={{ background: C.snowSoft }}>
        <WaveDivider from={C.snow} to={C.snowSoft} />
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="lp-chip">Como funciona</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Comece a usar em poucos passos
              </h2>
              <p className="mt-3" style={{ color: C.inkSoft }}>Ativação imediata após o cadastro.</p>
            </div>
          </Reveal>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <li className="lp-card p-6 h-full list-none">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-xl text-white text-sm font-bold"
                      style={{ background: `linear-gradient(135deg, ${C.brand}, #F97316)`, boxShadow: "0 6px 14px -6px rgba(234,88,12,.5)" }}
                    >
                      {i + 1}
                    </span>
                    <s.icon className="h-4 w-4" style={{ color: C.muted }} />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold" style={{ color: C.ink }}>{s.title}</h3>
                  <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>{s.desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
        <WaveDivider from={C.snowSoft} to={C.snow} flip />
      </section>

      {/* ========== BENEFÍCIOS ========== */}
      <section className="relative" style={{ background: C.snow }}>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="lp-chip">Benefícios</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Benefícios reais para o seu dia a dia
              </h2>
              <p className="mt-3" style={{ color: C.inkSoft }}>Ganhos práticos que a equipe percebe desde o primeiro dia.</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 50}>
                <div className="lp-card p-6 h-full">
                  <div className="lp-3d-tile grid h-12 w-12 place-items-center rounded-xl" style={{ color: C.brand }}>
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold" style={{ color: C.ink }}>{b.title}</h3>
                  <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <WaveDivider from={C.snow} to={C.snowSoft} />
      </section>

      {/* ========== SEGMENTOS ========== */}
      <section id="segmentos" className="relative" style={{ background: C.snowSoft }}>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="lp-chip">Segmentos</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Segmentos atendidos
              </h2>
              <p className="mt-3" style={{ color: C.inkSoft }}>Ideal para estabelecimentos do setor alimentício de qualquer porte.</p>
            </div>
          </Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {SEGMENTS.map((s, i) => (
              <Reveal key={s} delay={i * 30}>
                <span
                  className="rounded-full px-4 py-2 text-sm"
                  style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.ink, boxShadow: C.cardShadow }}
                >
                  {s}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
        <WaveDivider from={C.snowSoft} to={C.snow} flip />
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className="relative" style={{ background: C.snow }}>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Reveal>
            <div className="text-center">
              <span className="lp-chip">FAQ</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: C.ink }}>
                Perguntas frequentes
              </h2>
              <p className="mt-3" style={{ color: C.inkSoft }}>Tire dúvidas comuns sobre o teste gratuito e o uso da plataforma.</p>
            </div>
          </Reveal>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 40}>
                <details className="lp-card group p-5">
                  <summary className="cursor-pointer list-none font-medium" style={{ color: C.ink }}>
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="grid h-6 w-6 place-items-center rounded-full text-lg transition group-open:rotate-45" style={{ background: C.brandSoft, color: C.brand }}>+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm" style={{ color: C.inkSoft }}>{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA FINAL ========== */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.ink} 0%, #1E293B 100%)`,
        }}
      >
        <div className="lp-glow" style={{ background: C.brand, width: 380, height: 380, top: -100, right: -60, opacity: .45 }} />
        <div className="lp-glow" style={{ background: "#F59E0B", width: 260, height: 260, bottom: -80, left: -60, opacity: .3 }} />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl text-white">
              Pronto para organizar a sua operação?
            </h2>
            <p className="mt-3 text-white/80">
              Comece hoje o seu teste gratuito de 7 dias — ativação imediata, sem cartão de crédito.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="lp-btn-primary">
                <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" className="lp-btn-ghost" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.35)" }}>
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{ background: C.snow, borderTop: `1px solid ${C.line}` }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${C.brand}, #F97316)` }}>
                <Store className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold" style={{ color: C.ink }}>SaborSys</span>
            </div>
            <p className="mt-3 text-xs" style={{ color: C.muted }}>Sistema de gestão para o setor alimentício.</p>
          </div>
          <FooterCol title="Plataforma" items={[
            { label: "Recursos", href: "#recursos" },
            { label: "Demonstração", href: "#demonstracao" },
            { label: "Como funciona", href: "#como-funciona" },
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
        <div style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs md:flex-row" style={{ color: C.muted }}>
            <span>© {new Date().getFullYear()} SaborSys — Todos os direitos reservados</span>
            <span>Versão 1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =================================================
   Helpers / Sub-components
   ================================================= */

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(ref);
    return () => obs.disconnect();
  }, [ref]);
  return (
    <div ref={setRef} className={`lp-reveal ${inView ? "is-in" : ""}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function BadgeCheck({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: C.brandSoft, color: C.brand }}>
        <Check className="h-3 w-3" />
      </span>
      {children}
    </span>
  );
}

function WaveDivider({ from, to, flip = false }: { from: string; to: string; flip?: boolean }) {
  return (
    <div aria-hidden style={{ background: from, lineHeight: 0 }}>
      <svg
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="block h-[70px] w-full md:h-[90px]"
        style={{ transform: flip ? "scaleY(-1)" : undefined }}
      >
        <path
          d="M0,50 C240,90 480,10 720,40 C960,70 1200,20 1440,55 L1440,90 L0,90 Z"
          fill={to}
        />
      </svg>
    </div>
  );
}

function Cube3D({ size = 64, color = C.brand, r = "0deg" }: { size?: number; color?: string; r?: string }) {
  return (
    <div className="lp-float" style={{ ["--r" as any]: r, width: size, height: size }}>
      <div
        style={{
          width: size, height: size,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${color}, #F97316)`,
          boxShadow: `0 24px 40px -14px ${color}66, inset 0 -8px 20px rgba(0,0,0,.15), inset 0 8px 14px rgba(255,255,255,.35)`,
          transform: "rotate(12deg)",
        }}
      />
    </div>
  );
}

function Sphere3D({ size = 60 }: { size?: number }) {
  return (
    <div className="lp-drift" style={{ width: size, height: size }}>
      <div
        style={{
          width: size, height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 25%, #ffffff 0%, #FEE2CC 35%, ${C.brand} 100%)`,
          boxShadow: `0 22px 40px -14px rgba(234,88,12,.45), inset 0 -8px 14px rgba(0,0,0,.18)`,
        }}
      />
    </div>
  );
}

/* ----- Device mockups showing real screenshots ----- */

function DeviceBar({ label }: { label: string }) {
  return (
    <div className="lp-mockup-bar">
      <div className="flex items-center gap-1.5">
        <span className="lp-dot" style={{ background: "#F87171" }} />
        <span className="lp-dot" style={{ background: "#FBBF24" }} />
        <span className="lp-dot" style={{ background: "#34D399" }} />
      </div>
      <span>app.saborsys · {label}</span>
      <span style={{ width: 34 }} />
    </div>
  );
}

function LaptopMockup({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl" style={{ background: `radial-gradient(60% 60% at 60% 40%, ${C.brandSoft} 0%, transparent 70%)` }} />
      <div className="lp-mockup" style={{ transform: "perspective(1400px) rotateX(2deg)" }}>
        <DeviceBar label={label} />
        <img src={src} alt={`Tela real do sistema — ${label}`} loading="lazy" className="block w-full" />
      </div>
      {/* Laptop base */}
      <div
        className="mx-auto mt-1 h-3 rounded-b-2xl"
        style={{
          width: "92%",
          background: `linear-gradient(180deg, ${C.snowSoft}, ${C.line})`,
          boxShadow: "0 20px 30px -18px rgba(15,23,42,.25)",
        }}
      />
    </div>
  );
}

function TabletMockup({ src, label }: { src: string; label: string }) {
  return (
    <div className="mx-auto max-w-[380px]" style={{ transform: "rotate(-2deg)" }}>
      <div
        className="rounded-[28px] p-3"
        style={{ background: "#0F172A", boxShadow: C.cardShadowLg }}
      >
        <div className="overflow-hidden rounded-[18px] bg-white">
          <DeviceBar label={label} />
          <img src={src} alt={`Tablet — ${label}`} loading="lazy" className="block w-full" />
        </div>
      </div>
    </div>
  );
}

function PhoneMockup({ src, label }: { src: string; label: string }) {
  return (
    <div className="mx-auto max-w-[260px]" style={{ transform: "rotate(3deg)" }}>
      <div
        className="rounded-[36px] p-2"
        style={{ background: "#0F172A", boxShadow: C.cardShadowLg }}
      >
        <div className="overflow-hidden rounded-[28px] bg-white">
          <div className="flex items-center justify-center py-1.5" style={{ background: "#0F172A" }}>
            <span className="h-1 w-14 rounded-full" style={{ background: "#334155" }} />
          </div>
          <img src={src} alt={`Smartphone — ${label}`} loading="lazy" className="block w-full" />
          <div className="py-2 text-center text-[10px]" style={{ color: C.muted }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function DemoCard({ title, desc, src }: { title: string; desc: string; src: string }) {
  return (
    <div className="lp-card overflow-hidden">
      <DeviceBar label={title} />
      <div style={{ background: C.snowSoft }}>
        <img src={src} alt={`Tela real do sistema — ${title}`} loading="lazy" className="block w-full" />
      </div>
      <div className="px-5 py-4" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="font-display text-sm font-semibold" style={{ color: C.ink }}>{title}</div>
        <div className="text-xs" style={{ color: C.inkSoft }}>{desc}</div>
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="font-display text-sm font-semibold" style={{ color: C.ink }}>{title}</div>
      <ul className="mt-3 space-y-2 text-sm" style={{ color: C.inkSoft }}>
        {items.map((it) => (
          <li key={it.label}><a href={it.href} className="hover:underline">{it.label}</a></li>
        ))}
      </ul>
    </div>
  );
}
