import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  Building2, KeyRound, Clock, ShieldAlert, CalendarClock, TrendingUp, DollarSign, AlertTriangle,
  Sparkles, Heart, Send, Zap, Unlock, Ban, RotateCw, FileText, PlusCircle, ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/")({
  component: MasterDashboard,
});

type Tone = "green" | "orange" | "yellow" | "red" | "gray" | "blue" | "purple";
const toneMap: Record<Tone, { line: string; num: string; bg: string }> = {
  green: { line: "bg-emerald-400", num: "text-emerald-600", bg: "bg-emerald-100" },
  orange: { line: "bg-orange-400", num: "text-orange-600", bg: "bg-orange-100" },
  yellow: { line: "bg-yellow-400", num: "text-yellow-700", bg: "bg-yellow-100" },
  red: { line: "bg-red-400", num: "text-red-600", bg: "bg-red-100" },
  gray: { line: "bg-slate-400", num: "text-slate-500", bg: "bg-slate-100" },
  blue: { line: "bg-blue-400", num: "text-blue-600", bg: "bg-blue-100" },
  purple: { line: "bg-purple-400", num: "text-purple-600", bg: "bg-purple-100" },
};

function KpiCard({ icon: Icon, label, value, tone, rotate, radius }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; tone: Tone; rotate: string; radius: string;
}) {
  const t = toneMap[tone];
  return (
    <div className={`doodle-card doodle-card--sm doodle-hover p-4 ${radius} ${rotate} flex flex-col items-center text-center`}>
      <span className={`mb-2 grid h-11 w-11 place-items-center rounded-2xl border-2 border-slate-900 ${t.bg}`}>
        <Icon className={`h-5 w-5 ${t.num}`} />
      </span>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${t.num}`}>{value}</p>
      <span className={`mt-1 block h-1.5 w-10 rounded-full ${t.line}`} />
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function MasterDashboard() {
  const now = useNow();

  const dashQ = useQuery({
    queryKey: ["master-dashboard"],
    queryFn: async () => {
      const nowD = new Date();
      const in30 = new Date(); in30.setDate(nowD.getDate() + 30);
      const d7 = new Date(nowD.getTime() - 7 * 86400000).toISOString();
      const [tenants, licencas, expirando, vencidas, logs, novos, receita] = await Promise.all([
        supabase.from("tenants").select("id, status, plano, created_at"),
        supabase.from("licenses").select("id, situacao"),
        supabase.from("licenses").select("id").gte("vence_em", nowD.toISOString()).lte("vence_em", in30.toISOString()).eq("situacao", "ativa"),
        supabase.from("licenses").select("id").lt("vence_em", nowD.toISOString()).eq("situacao", "ativa"),
        supabase.from("master_logs").select("id, action, actor_email, entity, created_at, detalhes").order("created_at", { ascending: false }).limit(6),
        supabase.from("tenants").select("id").gte("created_at", d7),
        supabase.from("licenses").select("valor, situacao").eq("situacao", "ativa"),
      ]);
      const l = licencas.data ?? [];
      const count = (sit: string) => l.filter((x) => x.situacao === sit).length;
      const t = tenants.data ?? [];
      return {
        totalEmpresas: t.length,
        licAtivas: count("ativa"),
        licPendentes: count("pendente"),
        licBloqueadas: count("bloqueada") + count("suspensa"),
        licExpiradas: count("expirada") + (vencidas.data ?? []).length,
        novos7d: (novos.data ?? []).length,
        vencendo30d: (expirando.data ?? []).length,
        receitaMensal: (receita.data ?? []).reduce((s, x) => s + Number(x.valor ?? 0), 0),
        logs: logs.data ?? [],
      };
    },
  });

  const s = dashQ.data;

  const total = (s?.licAtivas ?? 0) + (s?.licPendentes ?? 0) + (s?.licBloqueadas ?? 0) + (s?.licExpiradas ?? 0);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const gA = pct(s?.licAtivas ?? 0);
  const gP = pct(s?.licPendentes ?? 0);
  const gB = pct(s?.licBloqueadas ?? 0);
  const conic = `conic-gradient(#43A047 0% ${gA}%, #EAB308 ${gA}% ${gA + gP}%, #EF4444 ${gA + gP}% ${gA + gP + gB}%, #94A3B8 ${gA + gP + gB}% 100%)`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="relative">
          <Send className="doodle-scribble doodle-float -top-6 left-40 h-10 w-10 rotate-[-20deg] text-blue-400" style={{ ["--r" as string]: "-20deg" }} />
          <Heart className="doodle-scribble -top-4 left-72 h-6 w-6 rotate-12 fill-red-300 text-red-400" />
          <Sparkles className="doodle-scribble -top-2 right-[-30px] h-7 w-7 text-yellow-400 doodle-wiggle" />
          <h1 className="text-4xl font-bold">Bem-vindo, Desenvolvedor! <span className="inline-block doodle-wiggle">👋</span></h1>
          <p className="mt-1 text-lg text-slate-500 underline decoration-orange-300 decoration-wavy underline-offset-4">
            Aqui você gerencia todas as empresas e licenças do sistema.
          </p>
        </div>
        <div className="doodle-card rounded-[24px_10px_20px_14px] rotate-1 px-5 py-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Data do sistema</div>
          <div className="mt-0.5 text-xl font-bold">{now ? fmtDate(now.toISOString()) : "--/--/----"}</div>
          <div className="text-sm text-slate-500">{now ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</div>
        </div>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <KpiCard icon={Building2} label="Total Empresas" value={s?.totalEmpresas ?? 0} tone="green" rotate="rotate-[-1deg]" radius="rounded-[24px_14px_28px_18px]" />
        <KpiCard icon={KeyRound} label="Ativas" value={s?.licAtivas ?? 0} tone="orange" rotate="rotate-1" radius="rounded-[18px_28px_14px_22px]" />
        <KpiCard icon={Clock} label="Pendentes" value={s?.licPendentes ?? 0} tone="yellow" rotate="rotate-[-2deg]" radius="rounded-[28px_16px_22px_14px]" />
        <KpiCard icon={ShieldAlert} label="Bloqueadas" value={s?.licBloqueadas ?? 0} tone="red" rotate="rotate-1" radius="rounded-[16px_24px_18px_28px]" />
        <KpiCard icon={CalendarClock} label="Expiradas" value={s?.licExpiradas ?? 0} tone="gray" rotate="rotate-[-1deg]" radius="rounded-[22px_18px_26px_14px]" />
        <KpiCard icon={TrendingUp} label="Novos (7d)" value={s?.novos7d ?? 0} tone="blue" rotate="rotate-2" radius="rounded-[14px_26px_18px_22px]" />
        <KpiCard icon={DollarSign} label="Receita/mês" value={fmtMoney(s?.receitaMensal ?? 0)} tone="green" rotate="rotate-[-1deg]" radius="rounded-[26px_14px_22px_20px]" />
        <KpiCard icon={AlertTriangle} label="Vence 30d" value={s?.vencendo30d ?? 0} tone="orange" rotate="rotate-1" radius="rounded-[20px_28px_14px_22px]" />
      </div>

      {/* Middle: quick actions + pie */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="doodle-card lg:col-span-2 relative rounded-[28px_16px_24px_18px] p-6">
          <Sparkles className="doodle-scribble -right-2 -top-3 h-7 w-7 rotate-12 text-yellow-400" />
          <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold">
            <Zap className="h-6 w-6 text-orange-500" /> Ações Rápidas
            <span className="ml-2 block h-1 w-14 rounded-full bg-orange-200" />
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/master/licencas" className="doodle-btn flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-emerald-100"><Unlock className="h-4 w-4 text-emerald-700" /></span>
              Liberar Licença
            </Link>
            <Link to="/master/licencas" className="doodle-btn flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-red-100"><Ban className="h-4 w-4 text-red-600" /></span>
              Bloquear Licença
            </Link>
            <Link to="/master/licencas" className="doodle-btn flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-blue-100"><RotateCw className="h-4 w-4 text-blue-600" /></span>
              Renovar Assinatura
            </Link>
            <Link to="/master/clientes" className="doodle-btn flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-orange-100"><PlusCircle className="h-4 w-4 text-orange-600" /></span>
              Criar Empresa
            </Link>
            <Link to="/master/licencas" className="doodle-btn flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-purple-100"><KeyRound className="h-4 w-4 text-purple-600" /></span>
              Gerar Nova Chave
            </Link>
            <Link to="/master/logs" className="doodle-btn flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-slate-100"><FileText className="h-4 w-4 text-slate-700" /></span>
              Ver Logs
            </Link>
          </div>
        </div>

        {/* Pie chart */}
        <div className="doodle-card relative rounded-[18px_30px_18px_26px] p-6">
          <Heart className="doodle-scribble -bottom-1 -right-1 h-6 w-6 fill-orange-200 text-orange-300" />
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
            📊 Licenças por Status
          </h2>
          <div className="flex flex-col items-center">
            <div
              className="relative grid h-40 w-40 place-items-center rounded-full border-2 border-slate-900"
              style={{ background: total > 0 ? conic : "#e2e8f0" }}
            >
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-slate-900 bg-white">
                <span className="text-lg font-bold">{total}</span>
              </div>
            </div>
            <ul className="mt-5 w-full space-y-1.5 text-sm font-bold">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-slate-900 bg-emerald-500" /> Ativas</span>
                <span className="text-emerald-600">{s?.licAtivas ?? 0}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-slate-900 bg-yellow-400" /> Pendentes</span>
                <span className="text-yellow-700">{s?.licPendentes ?? 0}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-slate-900 bg-red-500" /> Bloqueadas</span>
                <span className="text-red-600">{s?.licBloqueadas ?? 0}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-slate-900 bg-slate-400" /> Expiradas</span>
                <span className="text-slate-500">{s?.licExpiradas ?? 0}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="doodle-card relative rounded-[22px_32px_18px_28px] p-6">
        <Send className="doodle-scribble doodle-float -top-4 right-8 h-8 w-8 rotate-12 text-blue-300" style={{ ["--r" as string]: "12deg" }} />
        <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="h-6 w-6 text-orange-500" /> Atividades Recentes
          <span className="ml-2 block h-1 w-14 rounded-full bg-blue-200" />
        </h2>
        {(!s?.logs || s.logs.length === 0) ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhuma atividade recente.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {s.logs.map((l) => (
              <div key={l.id} className="doodle-card doodle-card--sm rounded-2xl p-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-slate-900 bg-orange-50">
                    <ScrollText className="h-4 w-4 text-orange-600" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-bold">{l.action}</div>
                    <div className="text-xs text-slate-500 truncate">{l.entity ?? "sistema"} · {l.actor_email ?? "—"}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{fmtDate(l.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
