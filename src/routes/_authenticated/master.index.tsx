import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  Building2, KeyRound, Clock, ShieldAlert, CalendarClock, TrendingUp, DollarSign, AlertTriangle,
  Unlock, Ban, RotateCw, FileText, PlusCircle, ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/")({
  component: MasterDashboard,
});

type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet";
const toneMap: Record<Tone, { bg: string; text: string }> = {
  blue:   { bg: "bg-[#eff6ff]", text: "text-[#2563eb]" },
  green:  { bg: "bg-[#ecfdf5]", text: "text-[#059669]" },
  amber:  { bg: "bg-[#fffbeb]", text: "text-[#d97706]" },
  red:    { bg: "bg-[#fef2f2]", text: "text-[#dc2626]" },
  slate:  { bg: "bg-[#f1f5f9]", text: "text-[#475569]" },
  violet: { bg: "bg-[#f5f3ff]", text: "text-[#7c3aed]" },
};

function KpiCard({ icon: Icon, label, value, tone, delta, deltaLabel }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; tone: Tone;
  delta?: number; deltaLabel?: string;
}) {
  const t = toneMap[tone];
  const up = (delta ?? 0) >= 0;
  return (
    <div className="ms-card ms-card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-[#6b7280]">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-[#0f172a]">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.bg}`}>
          <Icon className={`h-5 w-5 ${t.text}`} />
        </span>
      </div>
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-[12px]">
          <span className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-[#059669]" : "text-[#dc2626]"}`}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {up ? "+" : ""}{delta}%
          </span>
          <span className="text-[#9ca3af]">{deltaLabel ?? "este mês"}</span>
        </div>
      )}
    </div>
  );
}

function MasterDashboard() {
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
  const conic = `conic-gradient(#10b981 0% ${gA}%, #f59e0b ${gA}% ${gA + gP}%, #ef4444 ${gA + gP}% ${gA + gP + gB}%, #cbd5e1 ${gA + gP + gB}% 100%)`;

  const quickActions = [
    { to: "/master/licencas", icon: Unlock, label: "Liberar Licença", tone: "green" as Tone },
    { to: "/master/licencas", icon: Ban, label: "Bloquear Licença", tone: "red" as Tone },
    { to: "/master/licencas", icon: RotateCw, label: "Renovar Assinatura", tone: "blue" as Tone },
    { to: "/master/clientes", icon: PlusCircle, label: "Criar Empresa", tone: "violet" as Tone },
    { to: "/master/licencas", icon: KeyRound, label: "Gerar Nova Chave", tone: "amber" as Tone },
    { to: "/master/logs", icon: FileText, label: "Visualizar Logs", tone: "slate" as Tone },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-[#0f172a]">
          Bem-vindo, Desenvolvedor Master 👋
        </h1>
        <p className="mt-1 text-[14px] text-[#6b7280]">
          Gerencie empresas, licenças e assinaturas do sistema.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-4">
        <KpiCard icon={Building2}     label="Total de Empresas"   value={s?.totalEmpresas ?? 0} tone="blue"   delta={12} />
        <KpiCard icon={KeyRound}      label="Licenças Ativas"     value={s?.licAtivas ?? 0}     tone="green"  delta={8} />
        <KpiCard icon={Clock}         label="Licenças Pendentes"  value={s?.licPendentes ?? 0}  tone="amber"  delta={3} />
        <KpiCard icon={ShieldAlert}   label="Bloqueadas"          value={s?.licBloqueadas ?? 0} tone="red"    delta={-2} />
        <KpiCard icon={CalendarClock} label="Expiradas"           value={s?.licExpiradas ?? 0}  tone="slate"  delta={-1} />
        <KpiCard icon={TrendingUp}    label="Novos Cadastros"     value={s?.novos7d ?? 0}       tone="violet" delta={18} deltaLabel="últimos 7 dias" />
        <KpiCard icon={AlertTriangle} label="Vencendo em 30d"     value={s?.vencendo30d ?? 0}   tone="amber" />
        <KpiCard icon={DollarSign}    label="Receita/mês"         value={fmtMoney(s?.receitaMensal ?? 0)} tone="green" delta={15} />
      </div>

      {/* Main content: left widgets + right side panel */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Recent activity */}
          <div className="ms-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#0f172a]">Atividades Recentes</h2>
                <p className="text-[12px] text-[#6b7280]">Últimos eventos do sistema</p>
              </div>
              <Link to="/master/logs" className="ms-btn ms-btn--sm ms-btn--ghost text-[#2563eb]">
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {(!s?.logs || s.logs.length === 0) ? (
              <p className="py-12 text-center text-[13px] text-[#9ca3af]">Nenhuma atividade recente.</p>
            ) : (
              <ul className="divide-y divide-[#e5e7eb]">
                {s.logs.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#f9fafb]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eff6ff]">
                      <FileText className="h-4 w-4 text-[#2563eb]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-[#0f172a]">{l.action}</div>
                      <div className="truncate text-[12px] text-[#6b7280]">
                        {l.entity ?? "sistema"} · por {l.actor_email ?? "—"}
                      </div>
                    </div>
                    <div className="hidden text-right text-[12px] text-[#9ca3af] sm:block">
                      {fmtDate(l.created_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          {/* Quick actions */}
          <div className="ms-card p-5">
            <h3 className="text-[15px] font-semibold text-[#0f172a]">Ações Rápidas</h3>
            <p className="mt-0.5 text-[12px] text-[#6b7280]">Atalhos operacionais</p>
            <div className="mt-4 space-y-1">
              {quickActions.map((a) => {
                const t = toneMap[a.tone];
                return (
                  <Link
                    key={a.label}
                    to={a.to}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] font-medium text-[#0f172a] hover:bg-[#f9fafb]"
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${t.bg}`}>
                      <a.icon className={`h-4 w-4 ${t.text}`} />
                    </span>
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Licenses by status */}
          <div className="ms-card p-5">
            <h3 className="text-[15px] font-semibold text-[#0f172a]">Licenças por Status</h3>
            <div className="mt-4 flex items-center gap-5">
              <div
                className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
                style={{ background: total > 0 ? conic : "#e5e7eb" }}
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
                  <div className="text-center">
                    <div className="text-[18px] font-semibold leading-none text-[#0f172a]">{total}</div>
                    <div className="mt-0.5 text-[10px] text-[#6b7280]">Total</div>
                  </div>
                </div>
              </div>
              <ul className="flex-1 space-y-2 text-[13px]">
                <LegendRow color="#10b981" label="Ativas" value={s?.licAtivas ?? 0} />
                <LegendRow color="#f59e0b" label="Pendentes" value={s?.licPendentes ?? 0} />
                <LegendRow color="#ef4444" label="Bloqueadas" value={s?.licBloqueadas ?? 0} />
                <LegendRow color="#cbd5e1" label="Expiradas" value={s?.licExpiradas ?? 0} />
              </ul>
            </div>
          </div>

          {/* Revenue mini */}
          <div className="ms-card p-5">
            <h3 className="text-[15px] font-semibold text-[#0f172a]">Receita Mensal</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[24px] font-semibold tracking-tight text-[#0f172a]">
                {fmtMoney(s?.receitaMensal ?? 0)}
              </span>
              <span className="text-[12px] font-medium text-[#059669]">↑ 15% este mês</span>
            </div>
            <MiniSparkline />
          </div>
        </aside>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[#4b5563]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-medium text-[#0f172a]">{value}</span>
    </li>
  );
}

function MiniSparkline() {
  const points = [30, 32, 28, 40, 38, 45, 42, 50, 48, 55, 60, 58];
  const max = Math.max(...points);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * 100},${50 - (p / max) * 40}`).join(" ");
  return (
    <svg viewBox="0 0 100 55" preserveAspectRatio="none" className="mt-3 h-16 w-full">
      <defs>
        <linearGradient id="msSpark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100,55 L 0,55 Z`} fill="url(#msSpark)" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="1.5" />
    </svg>
  );
}
