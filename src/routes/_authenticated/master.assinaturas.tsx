import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { logMaster } from "@/lib/master-log";
import { fmtMoney, fmtDate } from "@/lib/format";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Users, DollarSign, Tag, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/assinaturas")({
  component: AssinaturasMaster,
});

type Plan = {
  id: string; slug: string; nome: string; ativo: boolean; ordem: number;
  preco_mensal: number; preco_trimestral: number; preco_anual: number;
  trial_dias: number; renovacao_automatica: boolean; em_breve: boolean;
};
type Benefit = { id: string; plan_id: string; texto: string; ordem: number; ativo: boolean };
type Coupon = {
  id: string; codigo: string; nome: string; tipo: "percentual" | "fixo";
  valor: number; validade: string | null; limite_uso: number | null; usos: number;
  ativo: boolean; aplicacao: "auto" | "manual"; plan_id: string | null;
};

function AssinaturasMaster() {
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["master-plans"],
    queryFn: async () => (await supabase.from("subscription_plans").select("*").order("ordem")).data as Plan[] ?? [],
  });
  const { data: benefits = [] } = useQuery({
    queryKey: ["master-benefits"],
    queryFn: async () => (await supabase.from("subscription_benefits").select("*").order("ordem")).data as Benefit[] ?? [],
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["master-coupons"],
    queryFn: async () => (await supabase.from("subscription_coupons").select("*").order("created_at", { ascending: false })).data as Coupon[] ?? [],
  });
  const { data: tenantsRaw = [] } = useQuery({
    queryKey: ["master-tenants-plans"],
    queryFn: async () => (await supabase.from("tenants").select("plano, status")).data ?? [],
  });

  const metrics = useMemo(() => {
    const ativos = tenantsRaw.filter((t) => t.status === "ativo");
    const perPlan = new Map<string, number>();
    ativos.forEach((t) => perPlan.set(t.plano, (perPlan.get(t.plano) ?? 0) + 1));
    const receitaMensal = plans.reduce((s, p) => s + p.preco_mensal * (perPlan.get(p.slug) ?? 0), 0);
    let topPlan = "—"; let topCount = 0;
    perPlan.forEach((c, s) => { if (c > topCount) { topCount = c; topPlan = s; } });
    const now = Date.now();
    const cupomAtivos = coupons.filter((c) => c.ativo && (!c.validade || new Date(c.validade).getTime() >= now)).length;
    const cupomExpirados = coupons.filter((c) => c.validade && new Date(c.validade).getTime() < now).length;
    return {
      assinantes: ativos.length,
      receitaMensal, receitaAnual: receitaMensal * 12,
      cupomAtivos, cupomExpirados,
      topPlan: topPlan === "—" ? "—" : `${topPlan} (${topCount})`,
    };
  }, [tenantsRaw, plans, coupons]);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-plans"] }); toast.success("Plano atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBenefit = useMutation({
    mutationFn: async ({ planId, texto }: { planId: string; texto: string }) => {
      const ord = benefits.filter((b) => b.plan_id === planId).length + 1;
      const { error } = await supabase.from("subscription_benefits").insert({ plan_id: planId, texto, ordem: ord } as never);
      if (error) throw error;
      await logMaster("subscription_benefit.create", "subscription_benefit", planId, { texto });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-benefits"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const updateBenefit = useMutation({
    mutationFn: async (b: Partial<Benefit> & { id: string }) => {
      const { id, ...rest } = b;
      const { error } = await supabase.from("subscription_benefits").update(rest as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-benefits"] }),
  });
  const removeBenefit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_benefits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-benefits"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-[#0f172a]">Assinaturas</h1>
        <p className="mt-1 text-[14px] text-[#6b7280]">Planos, benefícios, cupons e métricas em um único painel.</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={<Users className="h-4 w-4" />} label="Assinantes ativos" value={String(metrics.assinantes)} />
        <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Receita mensal" value={fmtMoney(metrics.receitaMensal)} />
        <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Receita anual" value={fmtMoney(metrics.receitaAnual)} />
        <MetricCard icon={<Tag className="h-4 w-4" />} label="Cupons ativos" value={String(metrics.cupomAtivos)} />
        <MetricCard icon={<Tag className="h-4 w-4" />} label="Cupons expirados" value={String(metrics.cupomExpirados)} />
        <MetricCard icon={<Star className="h-4 w-4" />} label="Plano top" value={metrics.topPlan} />
      </div>

      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
          <TabsTrigger value="cupons">Cupons</TabsTrigger>
        </TabsList>

        {/* PLANS */}
        <TabsContent value="planos" className="mt-4 grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} onSave={(np) => savePlan.mutate(np)} />
          ))}
        </TabsContent>

        {/* BENEFITS */}
        <TabsContent value="beneficios" className="mt-4 space-y-4">
          {plans.map((p) => {
            const list = benefits.filter((b) => b.plan_id === p.id).sort((a, b) => a.ordem - b.ordem);
            return (
              <div key={p.id} className="ms-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-[#0f172a]">{p.nome}</div>
                    <div className="text-[12px] text-[#6b7280]">{list.length} benefícios</div>
                  </div>
                  <AddBenefit onAdd={(texto) => addBenefit.mutate({ planId: p.id, texto })} />
                </div>
                <div className="space-y-1.5">
                  {list.length === 0 && <div className="text-[13px] text-[#9ca3af]">Nenhum benefício.</div>}
                  {list.map((b, i) => (
                    <div key={b.id} className="ms-hover-lift flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white p-2">
                      <Input value={b.texto} onChange={(e) => updateBenefit.mutate({ id: b.id, texto: e.target.value })} className="flex-1 border-0 focus-visible:ring-0" />
                      <Switch checked={b.ativo} onCheckedChange={(v) => updateBenefit.mutate({ id: b.id, ativo: v })} />
                      <button title="Subir" disabled={i === 0} onClick={() => {
                        const prev = list[i - 1];
                        updateBenefit.mutate({ id: b.id, ordem: prev.ordem });
                        updateBenefit.mutate({ id: prev.id, ordem: b.ordem });
                      }} className="ms-hover-icon rounded p-1 text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-30">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button title="Descer" disabled={i === list.length - 1} onClick={() => {
                        const next = list[i + 1];
                        updateBenefit.mutate({ id: b.id, ordem: next.ordem });
                        updateBenefit.mutate({ id: next.id, ordem: b.ordem });
                      }} className="ms-hover-icon rounded p-1 text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-30">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button title="Remover" onClick={async () => {
                        const ok = await dialog.confirm({ title: "Remover benefício?", destructive: true });
                        if (ok) removeBenefit.mutate(b.id);
                      }} className="ms-hover-icon rounded p-1 text-[#dc2626] hover:bg-[#fef2f2]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* COUPONS */}
        <TabsContent value="cupons" className="mt-4">
          <CouponsManager coupons={coupons} plans={plans} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="ms-card ms-hover-lift p-4">
      <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">{icon}{label}</div>
      <div className="mt-2 text-[20px] font-semibold text-[#0f172a]">{value}</div>
    </div>
  );
}

function PlanCard({ plan, onSave }: { plan: Plan; onSave: (p: Plan) => void }) {
  const [p, setP] = useState<Plan>(plan);
  return (
    <div className="ms-card ms-hover-lift p-5">
      <div className="mb-3 flex items-center justify-between">
        <Input value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} className="max-w-[220px] text-[16px] font-semibold" />
        <div className="flex items-center gap-2">
          {p.em_breve && <span className="ms-badge bg-[#fffbeb] text-[#d97706]">Em breve</span>}
          <Switch checked={p.ativo} onCheckedChange={(v) => setP({ ...p, ativo: v })} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div><Label>Mensal (R$)</Label><Input type="number" step="0.01" value={p.preco_mensal} onChange={(e) => setP({ ...p, preco_mensal: Number(e.target.value) })} /></div>
        <div><Label>Trimestral (R$)</Label><Input type="number" step="0.01" value={p.preco_trimestral} onChange={(e) => setP({ ...p, preco_trimestral: Number(e.target.value) })} /></div>
        <div><Label>Anual (R$)</Label><Input type="number" step="0.01" value={p.preco_anual} onChange={(e) => setP({ ...p, preco_anual: Number(e.target.value) })} /></div>
        <div><Label>Trial (dias)</Label><Input type="number" value={p.trial_dias} onChange={(e) => setP({ ...p, trial_dias: Number(e.target.value) })} /></div>
        <div className="flex items-center justify-between rounded border p-2 md:col-span-2">
          <div className="text-[12px]">Renovação automática</div>
          <Switch checked={p.renovacao_automatica} onCheckedChange={(v) => setP({ ...p, renovacao_automatica: v })} />
        </div>
        <div className="flex items-center justify-between rounded border p-2 md:col-span-3">
          <div className="text-[12px]">Marcar como "Em breve"</div>
          <Switch checked={p.em_breve} onCheckedChange={(v) => setP({ ...p, em_breve: v })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={() => onSave(p)}>Salvar plano</Button>
      </div>
    </div>
  );
}

function AddBenefit({ onAdd }: { onAdd: (t: string) => void }) {
  const [txt, setTxt] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Novo benefício..." value={txt} onChange={(e) => setTxt(e.target.value)} className="h-9 w-56" />
      <Button size="sm" onClick={() => { if (txt.trim()) { onAdd(txt.trim()); setTxt(""); } }}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
      </Button>
    </div>
  );
}

function CouponsManager({ coupons, plans }: { coupons: Coupon[]; plans: Plan[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [filter, setFilter] = useState<"todos" | "ativos" | "expirados">("todos");

  const now = Date.now();
  const filtered = coupons.filter((c) => {
    if (filter === "ativos") return c.ativo && (!c.validade || new Date(c.validade).getTime() >= now);
    if (filter === "expirados") return c.validade && new Date(c.validade).getTime() < now;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["todos", "ativos", "expirados"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition ${
                filter === k ? "bg-[#0f172a] text-white" : "bg-[#f1f5f9] text-[#4b5563] hover:bg-[#e5e7eb]"
              }`}>
              {k}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setEditing({ tipo: "percentual", valor: 10, aplicacao: "manual", ativo: true })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Novo cupom
        </Button>
      </div>

      <div className="ms-card overflow-hidden">
        <table className="ms-table">
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
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="!py-12 text-center text-[13px] text-[#9ca3af]">Nenhum cupom.</td></tr>
            )}
            {filtered.map((c) => {
              const expired = c.validade && new Date(c.validade).getTime() < now;
              return (
                <tr key={c.id} className="ms-hover-row">
                  <td className="font-mono text-[12px] text-[#0f172a]">{c.codigo}</td>
                  <td className="text-[13px]">{c.nome}</td>
                  <td className="text-[13px]">{c.tipo === "percentual" ? `${c.valor}%` : fmtMoney(c.valor)}</td>
                  <td className="text-[13px] text-[#4b5563]">{c.validade ? fmtDate(c.validade) : "—"}</td>
                  <td className="text-[13px]">{c.usos}{c.limite_uso ? ` / ${c.limite_uso}` : ""}</td>
                  <td className="text-[13px] capitalize">{c.aplicacao === "auto" ? "Automática" : "Manual"}</td>
                  <td className="text-[13px]">{plans.find((p) => p.id === c.plan_id)?.nome ?? "Todos"}</td>
                  <td>
                    <span className={`ms-badge ${expired ? "bg-[#f1f5f9] text-[#475569]" : c.ativo ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#fef2f2] text-[#dc2626]"}`}>
                      {expired ? "Expirado" : c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(c)} className="ms-hover-icon rounded p-1.5 text-[#2563eb] hover:bg-[#eff6ff]"><Pencil className="h-4 w-4" /></button>
                      <button onClick={async () => {
                        const ok = await dialog.confirm({ title: "Excluir cupom?", destructive: true });
                        if (ok) remove.mutate(c.id);
                      }} className="ms-hover-icon rounded p-1.5 text-[#dc2626] hover:bg-[#fef2f2]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Código *</Label><Input value={editing.codigo ?? ""} onChange={(e) => setEditing({ ...editing, codigo: e.target.value.toUpperCase() })} /></div>
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
              <div className="flex items-center justify-between rounded border p-2 md:col-span-2">
                <div className="text-[13px]">Ativo</div>
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.codigo || !editing?.nome} onClick={() => editing && save.mutate(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
