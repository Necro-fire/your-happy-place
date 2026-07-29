import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { logMaster } from "@/lib/master-log";
import { fmtMoney, fmtDate, fmtDateOnly } from "@/lib/format";
import {
  ArrowDown, ArrowUp, Pencil, Plus, Trash2, Users, DollarSign, Tag, Star,
  RefreshCw, Search, LayoutGrid, Gift, Layers, Ticket, UserCircle2, History,
  CheckCircle2, Clock, XCircle, Sparkles, Activity, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/assinaturas")({
  component: AssinaturasMaster,
});

/* ─────────────────────────── Types ─────────────────────────── */

type Plan = {
  id: string; slug: string; nome: string; ativo: boolean; ordem: number;
  preco_mensal: number; preco_trimestral: number; preco_anual: number;
  trial_dias: number; renovacao_automatica: boolean; em_breve: boolean;
  updated_at?: string;
};
type Benefit = { id: string; plan_id: string; texto: string; ordem: number; ativo: boolean };
type Coupon = {
  id: string; codigo: string; nome: string; tipo: "percentual" | "fixo";
  valor: number; validade: string | null; limite_uso: number | null; usos: number;
  ativo: boolean; aplicacao: "auto" | "manual"; plan_id: string | null;
};
type Feature = {
  id: string; chave: string; nome: string; descricao: string | null;
  status: "ativo" | "inativo" | "em_breve"; ordem: number;
};
type FeaturePlan = { feature_id: string; plan_id: string };
type Tenant = {
  id: string; nome: string; empresa: string | null; email: string | null;
  plano: string; status: string; ativado_em: string | null; vence_em: string | null;
  owner_user_id: string | null;
};
type Log = {
  id: string; action: string; entity: string | null; entity_id: string | null;
  actor_email: string | null; created_at: string; detalhes: Record<string, unknown> | null;
};

/* ─────────────────────────── Page ─────────────────────────── */

function AssinaturasMaster() {
  const qc = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data: plans = [], isLoading: loadingPlans, refetch: refetchPlans } = useQuery({
    queryKey: ["master-plans"],
    queryFn: async () => ((await supabase.from("subscription_plans").select("*").order("ordem")).data ?? []) as Plan[],
  });
  const { data: benefits = [], refetch: refetchBenefits } = useQuery({
    queryKey: ["master-benefits"],
    queryFn: async () => ((await supabase.from("subscription_benefits").select("*").order("ordem")).data ?? []) as Benefit[],
  });
  const { data: coupons = [], refetch: refetchCoupons } = useQuery({
    queryKey: ["master-coupons"],
    queryFn: async () => ((await supabase.from("subscription_coupons").select("*").order("created_at", { ascending: false })).data ?? []) as Coupon[],
  });
  const { data: features = [], refetch: refetchFeatures } = useQuery({
    queryKey: ["master-features"],
    queryFn: async () => ((await supabase.from("subscription_features").select("*").order("ordem")).data ?? []) as Feature[],
  });
  const { data: featurePlans = [], refetch: refetchFP } = useQuery({
    queryKey: ["master-feature-plans"],
    queryFn: async () => ((await supabase.from("subscription_feature_plans").select("*")).data ?? []) as FeaturePlan[],
  });
  const { data: tenants = [], refetch: refetchTenants } = useQuery({
    queryKey: ["master-tenants-subs"],
    queryFn: async () => ((await supabase.from("tenants").select("id, nome, empresa, email, plano, status, ativado_em, vence_em, owner_user_id")).data ?? []) as Tenant[],
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["master-subs-logs"],
    queryFn: async () => ((await supabase.from("master_logs")
      .select("id, action, entity, entity_id, actor_email, created_at, detalhes")
      .in("entity", ["subscription_plan", "subscription_benefit", "subscription_coupon", "subscription_feature"])
      .order("created_at", { ascending: false })
      .limit(200)).data ?? []) as Log[],
    refetchInterval: 20000,
  });

  // Realtime sync
  useEffect(() => {
    const ch = supabase.channel("master-subs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_plans" }, () => { refetchPlans(); setLastRefresh(new Date()); })
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_benefits" }, () => refetchBenefits())
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_coupons" }, () => refetchCoupons())
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_features" }, () => refetchFeatures())
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_feature_plans" }, () => refetchFP())
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, () => refetchTenants())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetchPlans, refetchBenefits, refetchCoupons, refetchFeatures, refetchFP, refetchTenants]);

  const refreshAll = () => {
    refetchPlans(); refetchBenefits(); refetchCoupons();
    refetchFeatures(); refetchFP(); refetchTenants();
    setLastRefresh(new Date());
    toast.success("Dados atualizados");
  };

  const metrics = useMemo(() => {
    const now = Date.now();
    const ativos = tenants.filter((t) => t.status === "ativo");
    const teste = tenants.filter((t) => t.status === "trial" || t.status === "teste");
    const expirados = tenants.filter((t) => t.vence_em && new Date(t.vence_em).getTime() < now);
    const perPlan = new Map<string, number>();
    ativos.forEach((t) => perPlan.set(t.plano, (perPlan.get(t.plano) ?? 0) + 1));
    const receitaMensal = plans.reduce((s, p) => s + p.preco_mensal * (perPlan.get(p.slug) ?? 0), 0);
    const cupomAtivos = coupons.filter((c) => c.ativo && (!c.validade || new Date(c.validade).getTime() >= now)).length;
    return {
      total: tenants.length,
      ativos: ativos.length,
      teste: teste.length,
      expirados: expirados.length,
      receitaMensal,
      receitaAnual: receitaMensal * 12,
      cupomAtivos,
    };
  }, [tenants, plans, coupons]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ms-card p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ms-text)] sm:text-[26px]">Assinaturas</h1>
            <p className="mt-1 text-[13px] text-[var(--ms-text-muted)] sm:text-[14px]">
              Central única de planos, benefícios, recursos, cupons e assinantes.
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--ms-text-muted)]">
              Última atualização: {fmtDate(lastRefresh)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll} className="shrink-0">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Metric icon={<Users className="h-4 w-4" />} label="Total" value={String(metrics.total)} tone="slate" loading={loadingPlans} />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Ativas" value={String(metrics.ativos)} tone="green" />
        <Metric icon={<Clock className="h-4 w-4" />} label="Em teste" value={String(metrics.teste)} tone="amber" />
        <Metric icon={<XCircle className="h-4 w-4" />} label="Expiradas" value={String(metrics.expirados)} tone="red" />
        <Metric icon={<DollarSign className="h-4 w-4" />} label="Receita mensal" value={fmtMoney(metrics.receitaMensal)} tone="blue" />
        <Metric icon={<TrendingUp className="h-4 w-4" />} label="Receita anual" value={fmtMoney(metrics.receitaAnual)} tone="indigo" />
        <Metric icon={<Tag className="h-4 w-4" />} label="Cupons ativos" value={String(metrics.cupomAtivos)} tone="violet" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="planos" className="space-y-4">
        <div className="ms-card p-1.5">
          <TabsList className="flex w-full flex-wrap gap-1 bg-transparent p-0">
            <TabTrigger value="planos" icon={<LayoutGrid className="h-3.5 w-3.5" />}>Planos</TabTrigger>
            <TabTrigger value="beneficios" icon={<Gift className="h-3.5 w-3.5" />}>Benefícios</TabTrigger>
            <TabTrigger value="recursos" icon={<Layers className="h-3.5 w-3.5" />}>Recursos</TabTrigger>
            <TabTrigger value="cupons" icon={<Ticket className="h-3.5 w-3.5" />}>Cupons</TabTrigger>
            <TabTrigger value="assinantes" icon={<UserCircle2 className="h-3.5 w-3.5" />}>Assinantes</TabTrigger>
            <TabTrigger value="historico" icon={<History className="h-3.5 w-3.5" />}>Histórico</TabTrigger>
          </TabsList>
        </div>

        <TabsContent value="planos" className="space-y-4">
          <PlansSection plans={plans} benefits={benefits} tenants={tenants} />
        </TabsContent>
        <TabsContent value="beneficios" className="space-y-4">
          <BenefitsSection plans={plans} benefits={benefits} />
        </TabsContent>
        <TabsContent value="recursos" className="space-y-4">
          <FeaturesSection plans={plans} features={features} featurePlans={featurePlans} />
        </TabsContent>
        <TabsContent value="cupons" className="space-y-4">
          <CouponsSection coupons={coupons} plans={plans} />
        </TabsContent>
        <TabsContent value="assinantes" className="space-y-4">
          <SubscribersSection tenants={tenants} plans={plans} />
        </TabsContent>
        <TabsContent value="historico" className="space-y-4">
          <HistorySection logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────────── UI atoms ─────────────────────────── */

function TabTrigger({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="flex-1 min-w-[110px] gap-1.5 rounded-lg text-[12.5px] font-medium data-[state=active]:bg-[var(--ms-text)] data-[state=active]:text-white sm:flex-none"
    >
      {icon}
      <span className="truncate">{children}</span>
    </TabsTrigger>
  );
}

const toneMap: Record<string, string> = {
  slate: "text-[#475569] bg-[#f1f5f9]",
  green: "text-[#059669] bg-[#ecfdf5]",
  amber: "text-[#d97706] bg-[#fffbeb]",
  red: "text-[#dc2626] bg-[#fef2f2]",
  blue: "text-[#2563eb] bg-[#eff6ff]",
  indigo: "text-[#4f46e5] bg-[#eef2ff]",
  violet: "text-[#7c3aed] bg-[#f5f3ff]",
};

function Metric({ icon, label, value, tone = "slate", loading }: { icon: React.ReactNode; label: string; value: string; tone?: keyof typeof toneMap | string; loading?: boolean }) {
  return (
    <div className="ms-card ms-hover-lift p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${toneMap[tone] ?? toneMap.slate}`}>{icon}</span>
        <span className="truncate text-[11.5px] font-medium text-[var(--ms-text-muted)]">{label}</span>
      </div>
      <div className="mt-2 text-[18px] font-semibold text-[var(--ms-text)] sm:text-[20px]">
        {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-[var(--ms-hover)]" /> : value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    ativo: { cls: "bg-[#ecfdf5] text-[#059669]", label: "Ativo" },
    inativo: { cls: "bg-[#fef2f2] text-[#dc2626]", label: "Inativo" },
    em_breve: { cls: "bg-[#fffbeb] text-[#d97706]", label: "Em breve" },
    trial: { cls: "bg-[#eff6ff] text-[#2563eb]", label: "Teste" },
    teste: { cls: "bg-[#eff6ff] text-[#2563eb]", label: "Teste" },
    expirado: { cls: "bg-[#f1f5f9] text-[#475569]", label: "Expirado" },
    suspenso: { cls: "bg-[#fef2f2] text-[#dc2626]", label: "Suspenso" },
  };
  const m = map[status] ?? { cls: "bg-[#f1f5f9] text-[#475569]", label: status };
  return <span className={`ms-badge ${m.cls}`}>{m.label}</span>;
}

/* ─────────────────────────── PLANS ─────────────────────────── */

function PlansSection({ plans, benefits, tenants }: { plans: Plan[]; benefits: Benefit[]; tenants: Tenant[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);

  const savePlan = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from("subscription_plans").update({
        nome: p.nome, ativo: p.ativo, ordem: p.ordem,
        preco_mensal: p.preco_mensal, preco_trimestral: p.preco_trimestral, preco_anual: p.preco_anual,
        trial_dias: p.trial_dias, renovacao_automatica: p.renovacao_automatica, em_breve: p.em_breve,
      }).eq("id", p.id);
      if (error) throw error;
      await logMaster("subscription_plan.update", "subscription_plan", p.id, { nome: p.nome });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-plans"] });
      toast.success("Plano atualizado");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from("subscription_plans").update({ ativo: !p.ativo }).eq("id", p.id);
      if (error) throw error;
      await logMaster("subscription_plan.toggle", "subscription_plan", p.id, { ativo: !p.ativo });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-plans"] }),
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.length === 0 && <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title="Nenhum plano" description="Nenhum plano configurado ainda." />}
        {plans.map((p) => {
          const bCount = benefits.filter((b) => b.plan_id === p.id).length;
          const subs = tenants.filter((t) => t.plano === p.slug && t.status === "ativo").length;
          return (
            <div key={p.id} className="ms-card ms-hover-lift overflow-hidden">
              <div className="border-b border-[var(--ms-border)] bg-gradient-to-br from-[var(--ms-hover)] to-transparent p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[17px] font-semibold text-[var(--ms-text)]">{p.nome}</h3>
                      {p.em_breve && <span className="ms-badge bg-[#fffbeb] text-[#d97706]">Em breve</span>}
                      <StatusBadge status={p.ativo ? "ativo" : "inativo"} />
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--ms-text-muted)]">{p.slug}</div>
                  </div>
                  <Switch checked={p.ativo} onCheckedChange={() => toggleActive.mutate(p)} />
                </div>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[28px] font-bold text-[var(--ms-text)]">{fmtMoney(p.preco_mensal)}</span>
                  <span className="text-[12px] text-[var(--ms-text-muted)]">/mês</span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-[var(--ms-border)] border-b border-[var(--ms-border)]">
                <PriceCell label="Trimestral" value={fmtMoney(p.preco_trimestral)} />
                <PriceCell label="Anual" value={fmtMoney(p.preco_anual)} />
                <PriceCell label="Teste" value={`${p.trial_dias}d`} />
              </div>

              <div className="grid grid-cols-3 divide-x divide-[var(--ms-border)] border-b border-[var(--ms-border)]">
                <StatCell icon={<Users className="h-3.5 w-3.5" />} label="Assinantes" value={String(subs)} />
                <StatCell icon={<Gift className="h-3.5 w-3.5" />} label="Benefícios" value={String(bCount)} />
                <StatCell icon={<Activity className="h-3.5 w-3.5" />} label="Atualizado" value={p.updated_at ? fmtDateOnly(p.updated_at) : "—"} />
              </div>

              <div className="flex flex-wrap gap-2 p-4">
                <Button size="sm" onClick={() => setEditing(p)} className="flex-1 min-w-[100px]">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(p)} className="flex-1 min-w-[100px]">
                  {p.ativo ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar plano</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome</Label><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Mensal (R$)</Label><Input type="number" step="0.01" value={editing.preco_mensal} onChange={(e) => setEditing({ ...editing, preco_mensal: Number(e.target.value) })} /></div>
              <div><Label>Trimestral (R$)</Label><Input type="number" step="0.01" value={editing.preco_trimestral} onChange={(e) => setEditing({ ...editing, preco_trimestral: Number(e.target.value) })} /></div>
              <div><Label>Anual (R$)</Label><Input type="number" step="0.01" value={editing.preco_anual} onChange={(e) => setEditing({ ...editing, preco_anual: Number(e.target.value) })} /></div>
              <div><Label>Teste (dias)</Label><Input type="number" value={editing.trial_dias} onChange={(e) => setEditing({ ...editing, trial_dias: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--ms-border)] p-2.5 sm:col-span-2">
                <div className="text-[13px]">Renovação automática</div>
                <Switch checked={editing.renovacao_automatica} onCheckedChange={(v) => setEditing({ ...editing, renovacao_automatica: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--ms-border)] p-2.5 sm:col-span-2">
                <div className="text-[13px]">Marcar como "Em breve"</div>
                <Switch checked={editing.em_breve} onCheckedChange={(v) => setEditing({ ...editing, em_breve: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--ms-border)] p-2.5 sm:col-span-2">
                <div className="text-[13px]">Plano ativo</div>
                <Switch checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && savePlan.mutate(editing)} disabled={savePlan.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PriceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 text-center">
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--ms-text-muted)]">{label}</div>
      <div className="mt-0.5 text-[13.5px] font-semibold text-[var(--ms-text)]">{value}</div>
    </div>
  );
}
function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-center gap-1 text-[10.5px] font-medium uppercase tracking-wide text-[var(--ms-text-muted)]">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-center text-[13px] font-semibold text-[var(--ms-text)]">{value}</div>
    </div>
  );
}

/* ─────────────────────────── BENEFITS ─────────────────────────── */

function BenefitsSection({ plans, benefits }: { plans: Plan[]; benefits: Benefit[] }) {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: async ({ planId, texto }: { planId: string; texto: string }) => {
      const ord = benefits.filter((b) => b.plan_id === planId).length + 1;
      const { error } = await supabase.from("subscription_benefits").insert({ plan_id: planId, texto, ordem: ord } as never);
      if (error) throw error;
      await logMaster("subscription_benefit.create", "subscription_benefit", planId, { texto });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-benefits"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async (b: Partial<Benefit> & { id: string }) => {
      const { id, ...rest } = b;
      const { error } = await supabase.from("subscription_benefits").update(rest as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-benefits"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_benefits").delete().eq("id", id);
      if (error) throw error;
      await logMaster("subscription_benefit.delete", "subscription_benefit", id, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-benefits"] }),
  });

  return (
    <div className="space-y-4">
      {plans.length === 0 && <EmptyState icon={<Gift className="h-6 w-6" />} title="Sem planos" description="Cadastre um plano antes de adicionar benefícios." />}
      {plans.map((p) => {
        const list = benefits.filter((b) => b.plan_id === p.id).sort((a, b) => a.ordem - b.ordem);
        return (
          <div key={p.id} className="ms-card p-4 sm:p-5">
            <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-[var(--ms-text)]">{p.nome}</h3>
                  {p.em_breve && <span className="ms-badge bg-[#fffbeb] text-[#d97706]">Em breve</span>}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--ms-text-muted)]">
                  {list.length} {list.length === 1 ? "benefício" : "benefícios"}
                </div>
              </div>
              <AddBenefit onAdd={(t) => add.mutate({ planId: p.id, texto: t })} />
            </div>

            <div className="space-y-1.5">
              {list.length === 0 && (
                <div className="rounded-lg border border-dashed border-[var(--ms-border)] p-4 text-center text-[12.5px] text-[var(--ms-text-muted)]">
                  Nenhum benefício cadastrado.
                </div>
              )}
              {list.map((b, i) => (
                <div key={b.id} className="ms-hover-lift grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[var(--ms-border)] bg-[var(--ms-surface)] p-2">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--ms-hover)] text-[11px] font-medium text-[var(--ms-text-muted)]">{i + 1}</div>
                  <Input value={b.texto} onChange={(e) => update.mutate({ id: b.id, texto: e.target.value })} className="min-w-0 border-0 bg-transparent focus-visible:ring-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={b.ativo} onCheckedChange={(v) => update.mutate({ id: b.id, ativo: v })} />
                    <IconBtn title="Subir" disabled={i === 0} onClick={() => {
                      const prev = list[i - 1];
                      update.mutate({ id: b.id, ordem: prev.ordem });
                      update.mutate({ id: prev.id, ordem: b.ordem });
                    }}><ArrowUp className="h-4 w-4" /></IconBtn>
                    <IconBtn title="Descer" disabled={i === list.length - 1} onClick={() => {
                      const next = list[i + 1];
                      update.mutate({ id: b.id, ordem: next.ordem });
                      update.mutate({ id: next.id, ordem: b.ordem });
                    }}><ArrowDown className="h-4 w-4" /></IconBtn>
                    <IconBtn title="Remover" tone="danger" onClick={async () => {
                      const ok = await dialog.confirm({ title: "Remover benefício?", destructive: true });
                      if (ok) remove.mutate(b.id);
                    }}><Trash2 className="h-4 w-4" /></IconBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddBenefit({ onAdd }: { onAdd: (t: string) => void }) {
  const [txt, setTxt] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Novo benefício..."
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && txt.trim()) { onAdd(txt.trim()); setTxt(""); } }}
        className="h-9 w-40 sm:w-56"
      />
      <Button size="sm" onClick={() => { if (txt.trim()) { onAdd(txt.trim()); setTxt(""); } }}>
        <Plus className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Adicionar</span>
      </Button>
    </div>
  );
}

function IconBtn({ children, tone, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "danger" }) {
  const cls = tone === "danger"
    ? "text-[#dc2626] hover:bg-[#fef2f2]"
    : "text-[var(--ms-text-muted)] hover:bg-[var(--ms-hover)]";
  return (
    <button {...rest} className={`ms-hover-icon rounded p-1 transition disabled:opacity-30 ${cls}`}>
      {children}
    </button>
  );
}

/* ─────────────────────────── FEATURES ─────────────────────────── */

function FeaturesSection({ plans, features, featurePlans }: { plans: Plan[]; features: Feature[]; featurePlans: FeaturePlan[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Feature> | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());

  const openEditor = (f?: Feature) => {
    if (f) {
      setEditing(f);
      setSelectedPlans(new Set(featurePlans.filter((fp) => fp.feature_id === f.id).map((fp) => fp.plan_id)));
    } else {
      setEditing({ status: "ativo", ordem: features.length + 1 });
      setSelectedPlans(new Set());
    }
  };

  const save = useMutation({
    mutationFn: async (f: Partial<Feature>) => {
      const { id, ...rest } = f;
      let fid = id;
      if (id) {
        const { error } = await supabase.from("subscription_features").update(rest as never).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("subscription_features").insert(rest as never).select().single();
        if (error) throw error;
        fid = data.id;
      }
      await supabase.from("subscription_feature_plans").delete().eq("feature_id", fid!);
      if (selectedPlans.size > 0) {
        const rows = Array.from(selectedPlans).map((plan_id) => ({ feature_id: fid!, plan_id }));
        const { error } = await supabase.from("subscription_feature_plans").insert(rows as never);
        if (error) throw error;
      }
      await logMaster(id ? "subscription_feature.update" : "subscription_feature.create", "subscription_feature", fid!, { chave: f.chave });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-features"] });
      qc.invalidateQueries({ queryKey: ["master-feature-plans"] });
      setEditing(null);
      toast.success("Recurso salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_features").delete().eq("id", id);
      if (error) throw error;
      await logMaster("subscription_feature.delete", "subscription_feature", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-features"] });
      qc.invalidateQueries({ queryKey: ["master-feature-plans"] });
      toast.success("Recurso removido");
    },
  });

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--ms-text)]">Recursos do plano</h2>
          <p className="text-[12.5px] text-[var(--ms-text-muted)]">Controle o que cada plano libera para o usuário.</p>
        </div>
        <Button size="sm" onClick={() => openEditor()}><Plus className="mr-1 h-3.5 w-3.5" /> Novo recurso</Button>
      </div>

      {features.length === 0 ? (
        <EmptyState icon={<Layers className="h-6 w-6" />} title="Nenhum recurso" description="Crie recursos para gerenciar o que cada plano libera." />
      ) : (
        <div className="ms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ms-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Chave</th>
                  <th>Status</th>
                  <th>Planos</th>
                  <th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => {
                  const linkedPlans = featurePlans.filter((fp) => fp.feature_id === f.id).map((fp) => plans.find((p) => p.id === fp.plan_id)?.nome).filter(Boolean);
                  return (
                    <tr key={f.id} className="ms-hover-row">
                      <td>
                        <div className="text-[13px] font-medium text-[var(--ms-text)]">{f.nome}</div>
                        {f.descricao && <div className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--ms-text-muted)]">{f.descricao}</div>}
                      </td>
                      <td className="font-mono text-[12px] text-[var(--ms-text-muted)]">{f.chave}</td>
                      <td><StatusBadge status={f.status} /></td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {linkedPlans.length === 0 ? (
                            <span className="text-[12px] text-[var(--ms-text-muted)]">—</span>
                          ) : (
                            linkedPlans.map((n) => (
                              <span key={n} className="ms-badge bg-[var(--ms-hover)] text-[var(--ms-text)]">{n}</span>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconBtn title="Editar" onClick={() => openEditor(f)}><Pencil className="h-4 w-4" /></IconBtn>
                          <IconBtn title="Remover" tone="danger" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Remover recurso?", destructive: true });
                            if (ok) remove.mutate(f.id);
                          }}><Trash2 className="h-4 w-4" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar recurso" : "Novo recurso"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Nome *</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Chave *</Label><Input value={editing.chave ?? ""} onChange={(e) => setEditing({ ...editing, chave: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="ex: kds_avancado" className="font-mono" /></div>
              <div className="sm:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={editing.status ?? "ativo"} onValueChange={(v) => setEditing({ ...editing, status: v as Feature["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="em_breve">Em breve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ordem</Label><Input type="number" value={editing.ordem ?? 0} onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} /></div>
              <div className="sm:col-span-2">
                <Label>Planos com acesso</Label>
                <div className="mt-1.5 space-y-1.5 rounded-lg border border-[var(--ms-border)] p-2.5">
                  {plans.map((p) => {
                    const on = selectedPlans.has(p.id);
                    return (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-[var(--ms-hover)]">
                        <Checkbox checked={on} onCheckedChange={(v) => {
                          const nx = new Set(selectedPlans);
                          if (v) nx.add(p.id); else nx.delete(p.id);
                          setSelectedPlans(nx);
                        }} />
                        <span className="flex-1 text-[13px]">{p.nome}</span>
                        {p.em_breve && <span className="ms-badge bg-[#fffbeb] text-[#d97706]">Em breve</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.nome || !editing?.chave || save.isPending} onClick={() => editing && save.mutate(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────── COUPONS ─────────────────────────── */

function CouponsSection({ coupons, plans }: { coupons: Coupon[]; plans: Plan[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [filter, setFilter] = useState<"todos" | "ativos" | "expirados" | "utilizados">("todos");
  const [planFilter, setPlanFilter] = useState<string>("__all");
  const [q, setQ] = useState("");

  const now = Date.now();
  const filtered = coupons.filter((c) => {
    if (filter === "ativos" && !(c.ativo && (!c.validade || new Date(c.validade).getTime() >= now))) return false;
    if (filter === "expirados" && !(c.validade && new Date(c.validade).getTime() < now)) return false;
    if (filter === "utilizados" && c.usos === 0) return false;
    if (planFilter !== "__all" && c.plan_id !== planFilter) return false;
    if (q && !(c.codigo + " " + c.nome).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Coupon>) => {
      const { id, ...rest } = c;
      if (id) {
        const { error } = await supabase.from("subscription_coupons").update(rest as never).eq("id", id);
        if (error) throw error;
        await logMaster("subscription_coupon.update", "subscription_coupon", id, {});
      } else {
        const { data, error } = await supabase.from("subscription_coupons").insert(rest as never).select().single();
        if (error) throw error;
        await logMaster("subscription_coupon.create", "subscription_coupon", data.id, { codigo: data.codigo });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-coupons"] }); setEditing(null); toast.success("Cupom salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_coupons").delete().eq("id", id);
      if (error) throw error;
      await logMaster("subscription_coupon.delete", "subscription_coupon", id, {});
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-coupons"] }); toast.success("Cupom removido"); },
  });

  return (
    <>
      <div className="ms-card p-3.5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ms-text-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por código ou nome..." className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os planos</SelectItem>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setEditing({ tipo: "percentual", valor: 10, aplicacao: "manual", ativo: true })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Novo cupom
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {(["todos", "ativos", "expirados", "utilizados"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition ${
                filter === k ? "bg-[var(--ms-text)] text-white" : "bg-[var(--ms-hover)] text-[var(--ms-text-muted)] hover:bg-[var(--ms-border)]"
              }`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Ticket className="h-6 w-6" />} title="Nenhum cupom" description="Nenhum cupom corresponde aos filtros atuais." />
      ) : (
        <div className="ms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ms-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Desconto</th>
                  <th>Validade</th>
                  <th>Uso</th>
                  <th>Aplicação</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const expired = c.validade && new Date(c.validade).getTime() < now;
                  return (
                    <tr key={c.id} className="ms-hover-row">
                      <td className="font-mono text-[12px] text-[var(--ms-text)]">{c.codigo}</td>
                      <td className="text-[13px]">{c.nome}</td>
                      <td className="text-[13px] font-medium">{c.tipo === "percentual" ? `${c.valor}%` : fmtMoney(c.valor)}</td>
                      <td className="text-[13px] text-[var(--ms-text-muted)]">{c.validade ? fmtDateOnly(c.validade) : "—"}</td>
                      <td className="text-[13px]">{c.usos}{c.limite_uso ? ` / ${c.limite_uso}` : ""}</td>
                      <td className="text-[13px] capitalize">{c.aplicacao === "auto" ? "Automática" : "Manual"}</td>
                      <td className="text-[13px]">{plans.find((p) => p.id === c.plan_id)?.nome ?? "Todos"}</td>
                      <td>
                        {expired ? <StatusBadge status="expirado" /> : <StatusBadge status={c.ativo ? "ativo" : "inativo"} />}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconBtn title="Editar" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></IconBtn>
                          <IconBtn title="Remover" tone="danger" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Excluir cupom?", destructive: true });
                            if (ok) remove.mutate(c.id);
                          }}><Trash2 className="h-4 w-4" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Código *</Label><Input value={editing.codigo ?? ""} onChange={(e) => setEditing({ ...editing, codigo: e.target.value.toUpperCase() })} className="font-mono" /></div>
              <div><Label>Nome *</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={editing.tipo ?? "percentual"} onValueChange={(v) => setEditing({ ...editing, tipo: v as "percentual" | "fixo" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor</Label><Input type="number" step="0.01" value={editing.valor ?? 0} onChange={(e) => setEditing({ ...editing, valor: Number(e.target.value) })} /></div>
              <div><Label>Validade</Label><Input type="date" value={editing.validade?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, validade: e.target.value || null })} /></div>
              <div><Label>Limite de uso</Label><Input type="number" value={editing.limite_uso ?? ""} onChange={(e) => setEditing({ ...editing, limite_uso: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Aplicação</Label>
                <Select value={editing.aplicacao ?? "manual"} onValueChange={(v) => setEditing({ ...editing, aplicacao: v as "auto" | "manual" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Automática</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Restringir a plano</Label>
                <Select value={editing.plan_id ?? "__all"} onValueChange={(v) => setEditing({ ...editing, plan_id: v === "__all" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todos os planos</SelectItem>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--ms-border)] p-2.5 sm:col-span-2">
                <div className="text-[13px]">Ativo</div>
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.codigo || !editing?.nome || save.isPending} onClick={() => editing && save.mutate(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────── SUBSCRIBERS ─────────────────────────── */

function SubscribersSection({ tenants, plans }: { tenants: Tenant[]; plans: Plan[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [planFilter, setPlanFilter] = useState<string>("__all");
  const [sort, setSort] = useState<"empresa" | "plano" | "vence">("empresa");

  const rows = useMemo(() => {
    const now = Date.now();
    let r = tenants.map((t) => {
      const plan = plans.find((p) => p.slug === t.plano);
      const diffDias = t.vence_em ? Math.floor((new Date(t.vence_em).getTime() - now) / 86400000) : null;
      return {
        ...t,
        planoNome: plan?.nome ?? t.plano,
        planoPreco: plan?.preco_mensal ?? 0,
        diffDias,
      };
    });
    if (statusFilter !== "todos") r = r.filter((t) => t.status === statusFilter);
    if (planFilter !== "__all") r = r.filter((t) => t.plano === plans.find((p) => p.id === planFilter)?.slug);
    if (q) r = r.filter((t) => (t.nome + " " + (t.empresa ?? "") + " " + (t.email ?? "")).toLowerCase().includes(q.toLowerCase()));
    r.sort((a, b) => {
      if (sort === "plano") return a.planoNome.localeCompare(b.planoNome);
      if (sort === "vence") return (a.vence_em ?? "").localeCompare(b.vence_em ?? "");
      return (a.empresa ?? a.nome).localeCompare(b.empresa ?? b.nome);
    });
    return r;
  }, [tenants, plans, q, statusFilter, planFilter, sort]);

  return (
    <>
      <div className="ms-card p-3.5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ms-text-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar empresa, proprietário ou email..." className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="trial">Teste</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os planos</SelectItem>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empresa">Ordenar: Empresa</SelectItem>
                <SelectItem value="plano">Ordenar: Plano</SelectItem>
                <SelectItem value="vence">Ordenar: Vencimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<UserCircle2 className="h-6 w-6" />} title="Sem assinantes" description="Nenhum assinante encontrado com os filtros aplicados." />
      ) : (
        <div className="ms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ms-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Proprietário</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Renovação</th>
                  <th>Restam</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="ms-hover-row">
                    <td>
                      <div className="text-[13px] font-medium text-[var(--ms-text)]">{t.empresa ?? t.nome}</div>
                      {t.email && <div className="text-[11.5px] text-[var(--ms-text-muted)]">{t.email}</div>}
                    </td>
                    <td className="text-[13px]">{t.nome}</td>
                    <td><span className="ms-badge bg-[var(--ms-hover)] text-[var(--ms-text)]">{t.planoNome}</span></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-[13px] text-[var(--ms-text-muted)]">{t.ativado_em ? fmtDateOnly(t.ativado_em) : "—"}</td>
                    <td className="text-[13px] text-[var(--ms-text-muted)]">{t.vence_em ? fmtDateOnly(t.vence_em) : "Vitalícia"}</td>
                    <td className="text-[13px]">
                      {t.diffDias === null ? "—" : t.diffDias < 0 ? (
                        <span className="text-[#dc2626]">Expirado</span>
                      ) : t.diffDias <= 7 ? (
                        <span className="text-[#d97706]">{t.diffDias}d</span>
                      ) : (
                        <span>{t.diffDias}d</span>
                      )}
                    </td>
                    <td className="text-[13px] font-medium">{fmtMoney(t.planoPreco)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── HISTORY ─────────────────────────── */

function HistorySection({ logs }: { logs: Log[] }) {
  const [q, setQ] = useState("");
  const filtered = logs.filter((l) => !q || (l.action + " " + (l.entity ?? "") + " " + (l.actor_email ?? "")).toLowerCase().includes(q.toLowerCase()));

  const actionLabel = (a: string): { label: string; icon: React.ReactNode; tone: string } => {
    if (a.includes("create")) return { label: "Criação", icon: <Plus className="h-3 w-3" />, tone: "bg-[#ecfdf5] text-[#059669]" };
    if (a.includes("update") || a.includes("toggle")) return { label: "Alteração", icon: <Pencil className="h-3 w-3" />, tone: "bg-[#eff6ff] text-[#2563eb]" };
    if (a.includes("delete")) return { label: "Exclusão", icon: <Trash2 className="h-3 w-3" />, tone: "bg-[#fef2f2] text-[#dc2626]" };
    return { label: a, icon: <Sparkles className="h-3 w-3" />, tone: "bg-[var(--ms-hover)] text-[var(--ms-text)]" };
  };
  const entityLabel = (e: string | null) => {
    if (!e) return "—";
    if (e === "subscription_plan") return "Plano";
    if (e === "subscription_benefit") return "Benefício";
    if (e === "subscription_coupon") return "Cupom";
    if (e === "subscription_feature") return "Recurso";
    return e;
  };

  return (
    <>
      <div className="ms-card p-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ms-text-muted)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por ação, entidade ou usuário..." className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="Sem histórico" description="Nenhuma alteração registrada ainda." />
      ) : (
        <div className="ms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ms-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const a = actionLabel(l.action);
                  return (
                    <tr key={l.id} className="ms-hover-row">
                      <td className="text-[12.5px] text-[var(--ms-text-muted)]">{fmtDate(l.created_at)}</td>
                      <td className="text-[13px]">{l.actor_email ?? "—"}</td>
                      <td>
                        <span className={`ms-badge inline-flex items-center gap-1 ${a.tone}`}>{a.icon}{a.label}</span>
                      </td>
                      <td className="text-[13px]">{entityLabel(l.entity)}</td>
                      <td className="max-w-[280px] truncate font-mono text-[11.5px] text-[var(--ms-text-muted)]">
                        {l.detalhes ? JSON.stringify(l.detalhes) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── Empty ─────────────────────────── */

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="ms-card grid place-items-center px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--ms-hover)] text-[var(--ms-text-muted)]">{icon}</div>
      <div className="mt-3 text-[15px] font-semibold text-[var(--ms-text)]">{title}</div>
      <div className="mt-1 max-w-sm text-[12.5px] text-[var(--ms-text-muted)]">{description}</div>
    </div>
  );
}
