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
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const [tenants, licencas, expirando, vencidas, logs, novos] = await Promise.all([
        supabase.from("tenants").select("id, status, plano, created_at"),
        supabase.from("licenses").select("id, situacao, valor, vence_em"),
        supabase.from("licenses").select("id").gte("vence_em", now.toISOString()).lte("vence_em", in30.toISOString()).eq("situacao", "ativa"),
        supabase.from("licenses").select("id").lt("vence_em", now.toISOString()).eq("situacao", "ativa"),
        supabase.from("master_logs").select("id").gte("created_at", new Date(now.getTime() - 86400000).toISOString()),
        supabase.from("tenants").select("id").gte("created_at", d7),
      ]);
      const t = tenants.data ?? [];
      const l = licencas.data ?? [];
      const receita = l.filter((x) => x.situacao === "ativa").reduce((s, x) => s + Number(x.valor ?? 0), 0);
      const count = (sit: string) => l.filter((x) => x.situacao === sit).length;
      return {
        totalEmpresas: t.length,
        bloqueados: t.filter((x) => x.status === "bloqueado").length,
        expirando: (expirando.data ?? []).length,
        vencidas: (vencidas.data ?? []).length,
        licAtivas: count("ativa"),
        licPendentes: count("pendente"),
        licBloqueadas: count("bloqueada"),
        licSuspensas: count("suspensa"),
        licExpiradas: count("expirada"),
        novos7d: (novos.data ?? []).length,
        receitaMensal: receita,
        logs24h: (logs.data ?? []).length,
      };
    },
  });

  const s = data ?? {
    totalEmpresas: 0, bloqueados: 0, expirando: 0, vencidas: 0,
    licAtivas: 0, licPendentes: 0, licBloqueadas: 0, licSuspensas: 0, licExpiradas: 0,
    novos7d: 0, receitaMensal: 0, logs24h: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-50">Painel do Desenvolvedor</h1>
        <p className="text-sm text-slate-400">Indicadores da plataforma e situação das licenças.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Building2} label="Empresas cadastradas" value={s.totalEmpresas} tone="indigo" />
        <Stat icon={Users} label="Novos cadastros (7d)" value={s.novos7d} tone="emerald" />
        <Stat icon={KeyRound} label="Licenças ativas" value={s.licAtivas} tone="emerald" />
        <Stat icon={Clock} label="Licenças pendentes" value={s.licPendentes} hint="Aguardando liberação" tone="amber" />
        <Stat icon={ShieldAlert} label="Licenças bloqueadas" value={s.licBloqueadas} tone="rose" />
        <Stat icon={ShieldAlert} label="Licenças suspensas" value={s.licSuspensas} tone="amber" />
        <Stat icon={AlertTriangle} label="Licenças expiradas" value={s.licExpiradas + s.vencidas} tone="rose" />
        <Stat icon={AlertTriangle} label="Vencendo em 30d" value={s.expirando} tone="amber" />
        <Stat icon={Activity} label="Receita ativa/mês" value={fmtMoney(s.receitaMensal)} tone="emerald" />
        <Stat icon={ShieldAlert} label="Empresas bloqueadas" value={s.bloqueados} tone="rose" />
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
