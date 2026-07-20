import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChefHat,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  Utensils,
  ClipboardList,
  Users,
  Heart,
  ArrowRight,
} from "lucide-react";
import { fetchMyRoles, landingRouteFor } from "@/hooks/use-role";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const roles = await fetchMyRoles();
      throw redirect({ to: landingRouteFor(roles) });
    }
  },
  head: () => ({ meta: [{ title: "Acesso — Sistema" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return toast.error(error.message); }
    const roles = await fetchMyRoles();
    setLoading(false);
    navigate({ to: landingRouteFor(roles) });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/admin", data: { nome } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu email.");
  }

  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um email com instruções.");
    setForgotMode(false);
  }

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setLoading(false);
        return toast.error(result.error.message || "Falha ao entrar com Google");
      }
      if (result.redirected) return;
      const roles = await fetchMyRoles();
      setLoading(false);
      navigate({ to: landingRouteFor(roles) });
    } catch (e: any) {
      setLoading(false);
      toast.error(e?.message || "Falha ao entrar com Google");
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(1200px_600px_at_-10%_-20%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent),radial-gradient(900px_500px_at_110%_120%,color-mix(in_oklab,var(--primary-glow)_18%,transparent),transparent)]">
      {/* Ambient doodles */}
      <Doodles />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-16 lg:px-10">
        {/* ── Institutional side ─────────────────────────── */}
        <section className="order-2 hidden animate-fade-in lg:order-1 lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Sua gestão, mais simples
          </div>

          <h1 className="font-display text-5xl font-black tracking-tight text-foreground lg:text-6xl">
            Sabor<span className="text-primary">Sys</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            O sistema completo para restaurantes, padarias, lanchonetes e muito
            mais. Toda a operação em um só lugar — com a leveza que o seu dia
            merece.
          </p>

          {/* Illustration */}
          <div className="relative mt-10 aspect-[5/4] w-full max-w-lg">
            <IllustrationPOS />
          </div>

          {/* Feature chips */}
          <ul className="mt-8 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: TrendingUp, label: "Vendas", tone: "text-emerald-500" },
              { icon: Utensils, label: "Cardápio", tone: "text-amber-500" },
              { icon: ClipboardList, label: "Estoque", tone: "text-sky-500" },
              { icon: Users, label: "Clientes", tone: "text-rose-500" },
            ].map(({ icon: Icon, label, tone }, i) => (
              <li
                key={label}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3 text-center shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated"
                style={{ animation: `fade-in .6s ease-out ${0.2 + i * 0.08}s both` }}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl bg-background/70 ${tone} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-foreground">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Auth card ──────────────────────────────────── */}
        <section
          className="order-1 lg:order-2"
          style={{ animation: "scale-in .5s cubic-bezier(.2,.9,.3,1.2) both, fade-in .5s ease-out both" }}
        >
          <div className="mx-auto w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated">
                <ChefHat className="h-5 w-5" />
              </div>
              <span className="font-display text-2xl font-black tracking-tight">
                Sabor<span className="text-primary">Sys</span>
              </span>
            </div>

            <div className="relative rounded-3xl border border-border/70 bg-card/80 p-7 shadow-elevated backdrop-blur-xl sm:p-9">
              {/* Little heart accent */}
              <Heart className="absolute -right-3 -top-3 h-6 w-6 rotate-12 fill-primary/20 stroke-primary" />

              <div className="mb-6 text-center">
                <h2 className="font-display text-3xl font-black tracking-tight text-foreground">
                  {forgotMode ? "Recuperar senha" : "Bem-vindo!"}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {forgotMode
                    ? "Enviaremos um link para redefinir sua senha."
                    : "Faça login para continuar gerenciando seu negócio."}
                </p>
              </div>

              {forgotMode ? (
                <form onSubmit={forgot} className="space-y-4">
                  <Field
                    id="em"
                    label="E-mail"
                    icon={Mail}
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(v) => setEmail(v)}
                    required
                  />
                  <Button disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold shadow-elevated transition-transform duration-200 hover:-translate-y-0.5">
                    {loading ? "Enviando..." : (<>Enviar link <ArrowRight className="ml-1 h-4 w-4" /></>)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl"
                    onClick={() => setForgotMode(false)}
                  >
                    Voltar
                  </Button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className="group mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-semibold text-foreground shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated disabled:opacity-60"
                  >
                    <GoogleIcon className="h-5 w-5" />
                    Continuar com Google
                  </button>
                  <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border/70" />
                    ou
                    <span className="h-px flex-1 bg-border/70" />
                  </div>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="mb-5 grid w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
                    <TabsTrigger value="login" className="rounded-lg data-[state=active]:shadow-soft">
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-lg data-[state=active]:shadow-soft">
                      Criar conta
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="focus-visible:outline-none">
                    <form onSubmit={signIn} className="space-y-4">
                      <StaggerItem delay={0}>
                        <Field
                          id="li-email"
                          label="E-mail"
                          icon={Mail}
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={setEmail}
                          required
                        />
                      </StaggerItem>
                      <StaggerItem delay={0.05}>
                        <Field
                          id="li-pwd"
                          label="Senha"
                          icon={Lock}
                          type={showPwd ? "text" : "password"}
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={setPassword}
                          required
                          trailing={
                            <button
                              type="button"
                              onClick={() => setShowPwd((v) => !v)}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          }
                        />
                      </StaggerItem>

                      <StaggerItem delay={0.1}>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setForgotMode(true)}
                            className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
                          >
                            Esqueceu sua senha?
                          </button>
                        </div>
                      </StaggerItem>

                      <StaggerItem delay={0.15}>
                        <Button
                          disabled={loading}
                          className="h-12 w-full rounded-xl text-base font-semibold shadow-elevated transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          {loading ? "Entrando..." : (<>Entrar <ArrowRight className="ml-1 h-4 w-4" /></>)}
                        </Button>
                      </StaggerItem>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="focus-visible:outline-none">
                    <form onSubmit={signUp} className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Novas contas entram como equipe da empresa.
                      </p>
                      <StaggerItem delay={0}>
                        <Field
                          id="su-nome"
                          label="Nome"
                          icon={User}
                          placeholder="Como podemos te chamar?"
                          value={nome}
                          onChange={setNome}
                          required
                        />
                      </StaggerItem>
                      <StaggerItem delay={0.05}>
                        <Field
                          id="su-email"
                          label="E-mail"
                          icon={Mail}
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={setEmail}
                          required
                        />
                      </StaggerItem>
                      <StaggerItem delay={0.1}>
                        <Field
                          id="su-pwd"
                          label="Senha"
                          icon={Lock}
                          type={showPwd ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={setPassword}
                          required
                          minLength={6}
                          trailing={
                            <button
                              type="button"
                              onClick={() => setShowPwd((v) => !v)}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          }
                        />
                      </StaggerItem>
                      <StaggerItem delay={0.15}>
                        <Button
                          disabled={loading}
                          className="h-12 w-full rounded-xl text-base font-semibold shadow-elevated transition-transform duration-200 hover:-translate-y-0.5"
                        >
                          {loading ? "Criando..." : (<>Criar conta <ArrowRight className="ml-1 h-4 w-4" /></>)}
                        </Button>
                      </StaggerItem>
                    </form>
                  </TabsContent>
                </Tabs>
                </>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Ao continuar, você concorda com nossos termos de uso.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─────────── Helpers ─────────── */

function StaggerItem({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ animation: `fade-in .5s ease-out ${delay}s both` }}>{children}</div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  trailing,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-foreground/90">
        {label}
      </Label>
      <div className="group relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground transition-colors group-focus-within:text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <Input
          id={id}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-xl border-border/70 bg-background/70 pl-10 pr-10 text-base shadow-none transition-all duration-200 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          {...rest}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.4-4.9 9.4-9.3 0-.6-.06-1.1-.14-1.6H12z"/>
      <path fill="#4285F4" d="M21.4 12.3c0-.6-.06-1.1-.14-1.6H12v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1v.02c3.3 0 6-1.9 7.6-4.4.9-1.4 1.4-3 1.4-2z"/>
      <path fill="#FBBC05" d="M5.4 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.5.3-2.1V7.4H2.7A9.6 9.6 0 0 0 2.4 12c0 1.6.4 3.1 1 4.4l2.7-2.3z"/>
      <path fill="#34A853" d="M12 21.6c2.6 0 4.7-.9 6.3-2.3l-3-2.3c-.8.6-1.9 1-3.3 1-2.5 0-4.7-1.7-5.5-4l-2.7 2.1c1.6 3.2 4.9 5.5 8.2 5.5z"/>
    </svg>
  );
}

function Doodles() {
  return (
    <>
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-primary-glow/10 blur-3xl" />
      <svg
        className="pointer-events-none absolute right-8 top-10 h-10 w-10 text-primary/50"
        style={{ animation: "fade-in 1s ease-out .3s both" }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-16 left-10 h-8 w-8 text-primary/40"
        style={{ animation: "fade-in 1s ease-out .5s both" }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M3 12c3-4 6-4 9 0s6 4 9 0" />
      </svg>
    </>
  );
}

function IllustrationPOS() {
  return (
    <div className="relative h-full w-full">
      {/* Soft blob */}
      <div className="absolute inset-0 rounded-[42%_58%_63%_37%/38%_45%_55%_62%] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
      {/* POS terminal card */}
      <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-elevated backdrop-blur">
        {/* Screen header */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground">PDV</span>
        </div>
        {/* Rows */}
        <div className="mt-3 space-y-2">
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-primary/15" />
              <div className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
        {/* Total pill */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-primary px-3 py-2 text-primary-foreground shadow-soft">
          <span className="text-[11px] font-semibold opacity-90">Total</span>
          <span className="font-display text-base font-black">R$ 148,90</span>
        </div>
      </div>

      {/* Floating tags */}
      <div
        className="absolute -left-2 top-6 flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-[11px] font-semibold shadow-soft backdrop-blur"
        style={{ animation: "fade-in .8s ease-out .4s both" }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Pedido confirmado
      </div>
      <div
        className="absolute -right-2 bottom-8 flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-[11px] font-semibold shadow-soft backdrop-blur"
        style={{ animation: "fade-in .8s ease-out .6s both" }}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        +32% em vendas
      </div>
    </div>
  );
}
