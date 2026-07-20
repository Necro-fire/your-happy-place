import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Building2, KeyRound, AlertTriangle, Activity, Clock, Users, ShieldAlert, ScrollText } from "lucide-react";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/master/")({
  component: MasterDashboard,
});

function Stat({ icon: Icon, label, value, hint, tone = "indigo" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string; tone?: string }) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-300",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300",
    slate: "from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-300",
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]} border p-4 text-slate-100`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
          <div className="mt-2 font-display text-2xl font-bold">{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
        </div>
        <Icon className="h-6 w-6 opacity-70" />
      </div>
    </Card>
  );
}

function MasterDashboard() {
  const { data } = useQuery({
    queryKey: ["master-dashboard"],
    queryFn: async () => {
      const now = new Date();
      const in30 = new Date(); in30.setDate(now.getDate() + 30);
      const [tenants, licencas, expirando, vencidas, logs] = await Promise.all([
        supabase.from("tenants").select("id, status, plano"),
        supabase.from("licenses").select("id, situacao, valor, vence_em"),
        supabase.from("licenses").select("id").gte("vence_em", now.toISOString()).lte("vence_em", in30.toISOString()).eq("situacao", "ativa"),
        supabase.from("licenses").select("id").lt("vence_em", now.toISOString()).eq("situacao", "ativa"),
        supabase.from("master_logs").select("id").gte("created_at", new Date(now.getTime() - 86400000).toISOString()),
      ]);
      const t = tenants.data ?? [];
      const l = licencas.data ?? [];
      const receita = l.filter((x) => x.situacao === "ativa").reduce((s, x) => s + Number(x.valor ?? 0), 0);
      return {
        totalEmpresas: t.length,
        ativos: t.filter((x) => x.status === "ativo").length,
        teste: t.filter((x) => x.status === "teste").length,
        bloqueados: t.filter((x) => x.status === "bloqueado").length,
        cancelados: t.filter((x) => x.status === "cancelado").length,
        expirando: (expirando.data ?? []).length,
        vencidas: (vencidas.data ?? []).length,
        licAtivas: l.filter((x) => x.situacao === "ativa").length,
        receitaMensal: receita,
        logs24h: (logs.data ?? []).length,
      };
    },
  });

  const s = data ?? {
    totalEmpresas: 0, ativos: 0, teste: 0, bloqueados: 0, cancelados: 0,
    expirando: 0, vencidas: 0, licAtivas: 0, receitaMensal: 0, logs24h: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-50">Visão Geral da Plataforma</h1>
        <p className="text-sm text-slate-400">Indicadores em tempo real do ambiente Master.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Building2} label="Empresas cadastradas" value={s.totalEmpresas} tone="indigo" />
        <Stat icon={Users} label="Clientes ativos" value={s.ativos} tone="emerald" />
        <Stat icon={Clock} label="Em teste" value={s.teste} tone="amber" />
        <Stat icon={ShieldAlert} label="Bloqueados" value={s.bloqueados} tone="rose" />
        <Stat icon={KeyRound} label="Licenças ativas" value={s.licAtivas} tone="indigo" />
        <Stat icon={AlertTriangle} label="Licenças expirando (30d)" value={s.expirando} tone="amber" />
        <Stat icon={AlertTriangle} label="Licenças vencidas" value={s.vencidas} tone="rose" />
        <Stat icon={Activity} label="Receita ativa/mês" value={fmtMoney(s.receitaMensal)} tone="emerald" />
      </div>

      <Card className="border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <ScrollText className="h-4 w-4" />
          <span className="text-sm">Ações registradas nas últimas 24h</span>
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-slate-50">{s.logs24h}</div>
        <p className="text-xs text-slate-400">Consulte a aba <span className="text-indigo-300">Logs & Auditoria</span> para detalhes.</p>
      </Card>
    </div>
  );
}
