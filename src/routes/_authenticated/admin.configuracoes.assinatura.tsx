import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Check, Crown, Zap, MessageCircle, ArrowUpRight, ShieldCheck,
  Star, TrendingUp, Package, CreditCard, Calendar, History, Clock, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/assinatura")({
  component: AssinaturaPage,
});

type Cycle = "mes" | "tri" | "ano";
type Plan = {
  id: string; slug: string; nome: string; ativo: boolean; ordem: number;
  preco_mensal: number; preco_trimestral: number; preco_anual: number;
  trial_dias: number; renovacao_automatica: boolean; em_breve: boolean;
  descricao?: string | null; cor?: string | null; tag?: string | null; arquivado?: boolean;
};
type Benefit = { id: string; plan_id: string; texto: string; ordem: number; ativo: boolean };
type Coupon = {
  id: string; codigo: string; nome: string; tipo: "percentual" | "fixo";
  valor: number; validade: string | null; limite_uso: number | null; usos: number;
  ativo: boolean; aplicacao: "auto" | "manual"; plan_id: string | null;
};

const CYCLE_LABEL: Record<Cycle, string> = { mes: "mês", tri: "trimestre", ano: "ano" };
const CYCLE_MONTHS: Record<Cycle, number> = { mes: 1, tri: 3, ano: 12 };

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function planPrice(p: Plan, cycle: Cycle): number {
  return cycle === "mes" ? Number(p.preco_mensal)
    : cycle === "tri" ? Number(p.preco_trimestral)
    : Number(p.preco_anual);
}

function savingsPct(p: Plan, cycle: Cycle) {
  if (cycle === "mes") return 0;
  const monthly = Number(p.preco_mensal) * CYCLE_MONTHS[cycle];
  const price = planPrice(p, cycle);
  if (!monthly || !price) return 0;
  return Math.round(((monthly - price) / monthly) * 100);
}

function planIcon(slug: string) {
  return slug === "plus" ? <Crown className="h-5 w-5" /> : <Package className="h-5 w-5" />;
}

function AssinaturaPage() {
  const qc = useQueryClient();

  // ─── Fonte única: tabelas gerenciadas pelo Admin Master ───
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").order("ordem");
      return ((data ?? []) as Plan[]).filter((p) => !p.arquivado);
    },
    staleTime: 30_000,
  });
  const { data: benefits = [] } = useQuery({
    queryKey: ["subscription-benefits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_benefits")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      return (data ?? []) as Benefit[];
    },
    staleTime: 30_000,
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["subscription-coupons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_coupons")
        .select("*")
        .eq("ativo", true);
      return (data ?? []) as Coupon[];
    },
    staleTime: 30_000,
  });

  // ─── Realtime: espelha alterações do Admin Master instantaneamente ───
  useEffect(() => {
    const channel = supabase
      .channel("subscription-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_plans" },
        () => qc.invalidateQueries({ queryKey: ["subscription-plans"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_benefits" },
        () => qc.invalidateQueries({ queryKey: ["subscription-benefits"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_coupons" },
        () => qc.invalidateQueries({ queryKey: ["subscription-coupons"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // ─── Tenant do usuário (plano atual + datas reais) ───
  const { data: tenant } = useQuery({
    queryKey: ["my-tenant-subscription"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("tenants")
        .select("id, plano, status, ativado_em, vence_em, created_at")
        .eq("owner_user_id", u.user.id)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const [cycle, setCycle] = useState<Cycle>("mes");

  const currentPlan = useMemo<Plan | null>(() => {
    if (!tenant || !plans.length) return null;
    return plans.find((p) => p.slug === tenant.plano) ?? plans[0] ?? null;
  }, [tenant, plans]);

  const contratacao = useMemo(() => {
    return tenant?.ativado_em
      ? new Date(tenant.ativado_em)
      : tenant?.created_at ? new Date(tenant.created_at) : null;
  }, [tenant]);

  const renovacao = useMemo(() => {
    if (tenant?.vence_em) return new Date(tenant.vence_em);
    if (!contratacao) return null;
    const d = new Date(contratacao);
    d.setMonth(d.getMonth() + CYCLE_MONTHS[cycle]);
    return d;
  }, [contratacao, cycle, tenant?.vence_em]);

  const cuponsAplicaveis = useMemo(() => {
    if (!currentPlan) return [];
    const now = Date.now();
    return coupons.filter((c) =>
      (!c.plan_id || c.plan_id === currentPlan.id)
      && (!c.validade || new Date(c.validade).getTime() >= now)
      && (!c.limite_uso || c.usos < c.limite_uso),
    );
  }, [coupons, currentPlan]);

  async function requestChange(target: Plan) {
    if (target.em_breve || !target.ativo) {
      toast.info(`${target.nome} estará disponível em breve.`);
      return;
    }
    const isSame = currentPlan?.id === target.id;
    const action = isSame ? "renovação" : "contratação";
    const ok = await dialog.confirm({
      title: `Solicitar ${action}`,
      description: `Deseja solicitar ${action} do ${target.nome} (${CYCLE_LABEL[cycle]}) por ${BRL(planPrice(target, cycle))}?\n\nNossa equipe entrará em contato para finalizar.`,
      confirmText: "Solicitar",
    });
    if (!ok) return;
    toast.success(`Solicitação de ${action} registrada. Entraremos em contato em breve.`);
  }

  function contactSupport() {
    toast.info("Abra o menu Suporte para falar com nossa equipe sobre planos.");
  }

  const availablePlans = plans;
  const plusUpgrade = plans.find((p) => p.slug === "plus");

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg sm:h-12 sm:w-12">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold sm:text-xl">Sua Assinatura</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Informações sincronizadas em tempo real com o painel oficial.
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
            <Badge variant="secondary" className="gap-1 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Plano atual: {currentPlan?.nome ?? "—"}
            </Badge>
            <StatusBadge status={tenant?.status ?? null} />
          </div>
        </div>
      </Card>

      {/* Cycle switcher */}
      <div className="flex flex-col items-center gap-3">
        <Tabs value={cycle} onValueChange={(v) => setCycle(v as Cycle)} className="w-full sm:w-auto">
          <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:h-11 sm:w-auto">
            <TabsTrigger value="mes" className="px-3 py-2 sm:px-5">Mensal</TabsTrigger>
            <TabsTrigger value="tri" className="flex-col gap-1 px-3 py-2 sm:flex-row sm:gap-2 sm:px-5">
              <span>Trimestral</span>
              {currentPlan && savingsPct(currentPlan, "tri") > 0 && (
                <Badge variant="secondary" className="h-5 bg-emerald-500/15 text-[10px] text-emerald-600">
                  −{savingsPct(currentPlan, "tri")}%
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ano" className="flex-col gap-1 px-3 py-2 sm:flex-row sm:gap-2 sm:px-5">
              <span>Anual</span>
              {currentPlan && savingsPct(currentPlan, "ano") > 0 && (
                <Badge variant="secondary" className="h-5 bg-emerald-500/15 text-[10px] text-emerald-600">
                  −{savingsPct(currentPlan, "ano")}%
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="px-4 text-center text-xs text-muted-foreground">
          Economize contratando trimestralmente ou anualmente.
        </p>
      </div>

      {/* Plans (dinâmicos) */}
      <div className={cn("grid gap-5", availablePlans.length >= 2 ? "md:grid-cols-2" : "md:grid-cols-1")}>
        {availablePlans.map((p) => {
          const list = benefits.filter((b) => b.plan_id === p.id).sort((a, b) => a.ordem - b.ordem);
          return (
            <PlanCard
              key={p.id}
              plan={p}
              cycle={cycle}
              features={list.map((b) => b.texto)}
              current={currentPlan?.id === p.id}
              onSelect={() => requestChange(p)}
            />
          );
        })}
        {availablePlans.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-2">
            Nenhum plano configurado. O administrador precisa cadastrar planos no painel.
          </Card>
        )}
      </div>

      {/* Cupons aplicáveis */}
      {cuponsAplicaveis.length > 0 && (
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold sm:text-lg">Cupons disponíveis</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cuponsAplicaveis.map((c) => (
              <div key={c.id} className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-sm font-semibold">{c.codigo}</div>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                    {c.tipo === "percentual" ? `${c.valor}% OFF` : `${BRL(Number(c.valor))} OFF`}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{c.nome}</div>
                {c.validade && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Válido até {new Date(c.validade).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current subscription */}
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold sm:text-lg">Informações da Assinatura Atual</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={<Crown className="h-4 w-4" />} label="Plano" value={currentPlan?.nome ?? "—"} />
          <InfoItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Valor"
            value={currentPlan ? `${BRL(planPrice(currentPlan, cycle))} / ${CYCLE_LABEL[cycle]}` : "—"}
          />
          <InfoItem
            icon={<span className="grid h-4 w-4 place-items-center"><span className="h-2 w-2 rounded-full bg-emerald-500" /></span>}
            label="Situação"
            value={<StatusText status={tenant?.status ?? null} />}
          />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Contratação"
            value={contratacao ? contratacao.toLocaleDateString("pt-BR") : "—"} />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Renovação"
            value={renovacao ? renovacao.toLocaleDateString("pt-BR") : "—"} />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Período de teste"
            value={currentPlan?.trial_dias ? `${currentPlan.trial_dias} dias` : "Não aplicável"} />
          <InfoItem icon={<CreditCard className="h-4 w-4" />} label="Renovação automática"
            value={currentPlan?.renovacao_automatica ? "Ativa" : "Manual"} />
          <InfoItem icon={<Tag className="h-4 w-4" />} label="Cupons disponíveis"
            value={String(cuponsAplicaveis.length)} />
        </div>
        <Separator className="my-5" />
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {currentPlan && !currentPlan.em_breve && (
            <Button onClick={() => requestChange(currentPlan)} variant="outline" className="w-full sm:w-auto">
              <Zap className="mr-2 h-4 w-4" /> Renovar assinatura
            </Button>
          )}
          {plusUpgrade && currentPlan?.slug !== "plus" && (
            <Button
              variant="outline"
              disabled={plusUpgrade.em_breve || !plusUpgrade.ativo}
              onClick={() => requestChange(plusUpgrade)}
              className="w-full gap-2 sm:w-auto"
            >
              <ArrowUpRight className="h-4 w-4" /> Upgrade para {plusUpgrade.nome}
              {plusUpgrade.em_breve && (
                <Badge variant="secondary" className="ml-1 gap-1">
                  <Clock className="h-3 w-3" /> Em breve
                </Badge>
              )}
            </Button>
          )}
          <Button variant="ghost" onClick={contactSupport} className="w-full sm:w-auto">
            <MessageCircle className="mr-2 h-4 w-4" /> Falar com suporte
          </Button>
        </div>
      </Card>

      {/* History */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Histórico</h3>
        </div>
        <ul className="space-y-3 text-sm">
          {contratacao && (
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <div className="font-medium">Assinatura iniciada — {currentPlan?.nome ?? "Plano"}</div>
                <div className="text-xs text-muted-foreground">{contratacao.toLocaleDateString("pt-BR")}</div>
              </div>
            </li>
          )}
          <li className="flex items-start gap-3 text-muted-foreground">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
            <div>
              <div>Aguardando novas movimentações</div>
              <div className="text-xs">O histórico completo aparecerá aqui.</div>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  );
}


function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  if (s === "ativo") {
    return (
      <Badge className="gap-1 bg-emerald-500/15 py-1 text-emerald-600 hover:bg-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativa
      </Badge>
    );
  }
  if (s === "suspenso" || s === "cancelado") {
    return (
      <Badge className="gap-1 bg-destructive/15 py-1 text-destructive hover:bg-destructive/20">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {s === "cancelado" ? "Cancelada" : "Suspensa"}
      </Badge>
    );
  }
  return <Badge variant="secondary" className="py-1">Indefinida</Badge>;
}

function StatusText({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  if (s === "ativo") return <span className="text-emerald-600">Ativa</span>;
  if (s === "suspenso") return <span className="text-destructive">Suspensa</span>;
  if (s === "cancelado") return <span className="text-destructive">Cancelada</span>;
  return <span className="text-muted-foreground">—</span>;
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function PlanCard({
  plan, cycle, features, current, onSelect,
}: {
  plan: Plan;
  cycle: Cycle;
  features: string[];
  current?: boolean;
  onSelect: () => void;
}) {
  const price = planPrice(plan, cycle);
  const saving = savingsPct(plan, cycle);
  const monthlyEq = price / CYCLE_MONTHS[cycle];
  const comingSoon = plan.em_breve || !plan.ativo;
  const highlighted =
    (plan.tag === "Mais Popular" || plan.tag === "Recomendado" || plan.slug === "plus") && !comingSoon;
  const accent = plan.cor || undefined;

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden p-5 transition-all duration-300 sm:p-6",
        comingSoon
          ? "border-dashed border-border/70 bg-muted/20 opacity-90"
          : "hover:-translate-y-0.5 hover:shadow-xl",
        highlighted
          ? "border-primary/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg ring-1 ring-primary/20"
          : "border-border",
      )}
      style={accent && !comingSoon ? { borderColor: `${accent}55`, boxShadow: highlighted ? `0 8px 32px -12px ${accent}55` : undefined } : undefined}
    >
      {(comingSoon || plan.tag || current) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {current && !comingSoon && (
            <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
              <ShieldCheck className="h-3 w-3" /> Plano Atual
            </Badge>
          )}
          {plan.tag && !comingSoon && (
            <Badge
              className="gap-1"
              style={accent ? { background: `${accent}22`, color: accent } : undefined}
            >
              <Star className="h-3 w-3 fill-current" /> {plan.tag}
            </Badge>
          )}
          {comingSoon && (
            <Badge variant="secondary" className="ml-auto gap-1">
              <Clock className="h-3 w-3" /> Em breve
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
            comingSoon ? "bg-muted text-muted-foreground" :
              highlighted ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
          )}
          style={accent && !comingSoon ? { background: highlighted ? accent : `${accent}20`, color: highlighted ? "#fff" : accent } : undefined}
        >
          {planIcon(plan.slug)}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold sm:text-xl">{plan.nome}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {plan.descricao || (highlighted ? "Recursos avançados para escalar o negócio."
              : "Tudo o que você precisa para operar seu negócio.")}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "font-display text-4xl font-bold tracking-tight",
            comingSoon && "text-muted-foreground",
          )}>{BRL(price)}</span>
          <span className="text-sm text-muted-foreground">/ {CYCLE_LABEL[cycle]}</span>
        </div>
        {cycle !== "mes" && !comingSoon && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Equivale a {BRL(monthlyEq)}/mês</span>
            {saving > 0 && (
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">
                Economize {saving}%
              </Badge>
            )}
          </div>
        )}
        {plan.trial_dias > 0 && !comingSoon && (
          <div className="mt-1 text-xs text-muted-foreground">
            {plan.trial_dias} dias de teste gratuito.
          </div>
        )}
        {comingSoon && (
          <p className="mt-2 text-xs text-muted-foreground">
            Este plano será disponibilizado em breve. Aguarde novidades.
          </p>
        )}
      </div>

      <Separator className="my-5" />

      <ul className="flex-1 space-y-2.5">
        {features.length === 0 && (
          <li className="text-sm text-muted-foreground">Sem benefícios cadastrados.</li>
        )}
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span className={cn(
              "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
              comingSoon ? "bg-muted text-muted-foreground" :
                highlighted ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-600",
            )}>
              <Check className="h-3 w-3" />
            </span>
            <span className={cn(comingSoon && "text-muted-foreground")}>{f}</span>
          </li>
        ))}
      </ul>

      {comingSoon ? (
        <Button disabled variant="outline" size="lg" className="mt-6 w-full gap-2">
          <Clock className="h-4 w-4" /> Em breve
        </Button>
      ) : (
        <Button
          onClick={onSelect}
          disabled={current}
          className={cn("mt-6 w-full", highlighted && !current && "bg-primary hover:bg-primary/90")}
          variant={current ? "outline" : "default"}
          size="lg"
        >
          {current ? "Plano atual" : "Contratar plano"}
        </Button>
      )}
    </Card>
  );
}
