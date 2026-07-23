import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, CreditCard } from "lucide-react";
import { useMyLicense, remainingMs } from "@/hooks/use-license";
import { useMyRoles, isMaster } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

const TRIAL_TOTAL_MS = 7 * 24 * 60 * 60 * 1000;

const ALERTS: { key: string; ms: number; label: string; desc: string }[] = [
  { key: "3d",  ms: 3 * 24 * 60 * 60 * 1000, label: "Faltam 3 dias de teste",       desc: "Assine agora para não perder o acesso." },
  { key: "24h", ms: 24 * 60 * 60 * 1000,     label: "Último dia de teste gratuito", desc: "Seu período termina em menos de 24 horas." },
  { key: "12h", ms: 12 * 60 * 60 * 1000,     label: "Restam 12 horas de teste",     desc: "Garanta seu acesso contínuo assinando agora." },
  { key: "1h",  ms: 60 * 60 * 1000,          label: "Restam apenas 1 hora",         desc: "O painel será bloqueado quando o tempo acabar." },
  { key: "10m", ms: 10 * 60 * 1000,          label: "10 minutos restantes",         desc: "Assine imediatamente para evitar o bloqueio." },
];

function format(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function TrialCountdown() {
  const { data: license } = useMyLicense();
  const { data: roles = [] } = useMyRoles();
  const [tick, setTick] = useState(0);
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => remainingMs(license), [license, tick]);

  useEffect(() => {
    if (remaining == null || remaining <= 0) return;
    for (const a of ALERTS) {
      if (remaining <= a.ms && !notified.current.has(a.key)) {
        notified.current.add(a.key);
        toast.warning(a.label, { description: a.desc, duration: 6000 });
        break;
      }
    }
  }, [remaining]);

  if (isMaster(roles)) return null;
  if (!license || license.tipo !== "trial" || license.situacao !== "ativa") return null;
  if (remaining == null) return null;

  const clamped = Math.max(0, remaining);
  const { d, h, m, s } = format(clamped);
  const pctLeft = Math.max(0, Math.min(100, (clamped / TRIAL_TOTAL_MS) * 100));

  const tone =
    clamped < 24 * 60 * 60 * 1000
      ? { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-300", ring: "ring-red-200" }
      : clamped < 3 * 24 * 60 * 60 * 1000
        ? { bar: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300", ring: "ring-orange-200" }
        : { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300", ring: "ring-emerald-200" };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={cn("flex flex-wrap items-center gap-3 border-b px-4 py-2.5", tone.bg, tone.border)}>
      <div className="flex min-w-0 items-center gap-2">
        <Clock className={cn("h-4 w-4 shrink-0", tone.text)} />
        <span className={cn("text-sm font-semibold", tone.text)}>Teste gratuito termina em:</span>
        <span className={cn("font-mono text-sm font-bold tabular-nums", tone.text)}>
          {d}d {pad(h)}h {pad(m)}m {pad(s)}s
        </span>
      </div>

      <div className="order-3 h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-white/70 sm:order-none">
        <div className={cn("h-full transition-all duration-500", tone.bar)} style={{ width: `${pctLeft}%` }} />
      </div>

      <Link
        to="/admin/configuracoes/assinatura"
        className={cn(
          "ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-sm ring-1 transition hover:brightness-110",
          tone.ring,
        )}
      >
        <CreditCard className="h-3.5 w-3.5" /> Assinar agora
      </Link>
    </div>
  );
}
