import { useEffect } from "react";
import { useMyLicense, remainingMs, type LicenseStatus } from "@/hooks/use-license";
import { useMyRoles, isMaster } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldAlert, Clock, Ban, LogOut, Copy, CreditCard, CheckCircle2, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const CONFIG: Record<LicenseStatus, { title: string; msg: string; badge: string; icon: typeof Clock }> = {
  pendente: {
    title: "Assinatura aguardando aprovação",
    msg: "Sua conta foi criada. O acesso ao painel será liberado assim que o pagamento da assinatura for confirmado.",
    badge: "bg-amber-500/20 text-amber-700 border-amber-500/40",
    icon: Clock,
  },
  ativa: { title: "", msg: "", badge: "", icon: KeyRound },
  suspensa: {
    title: "Licença suspensa",
    msg: "Sua licença está temporariamente suspensa. Regularize sua assinatura para reativar o acesso.",
    badge: "bg-amber-500/20 text-amber-700 border-amber-500/40",
    icon: ShieldAlert,
  },
  bloqueada: {
    title: "Licença bloqueada",
    msg: "O acesso ao painel foi bloqueado. Entre em contato com o suporte para regularizar sua situação.",
    badge: "bg-rose-500/20 text-rose-700 border-rose-500/40",
    icon: Ban,
  },
  expirada: {
    title: "Seu teste gratuito terminou",
    msg: "Seus dados continuam salvos com segurança. Assine agora para restaurar imediatamente o acesso ao painel.",
    badge: "bg-rose-500/20 text-rose-700 border-rose-500/40",
    icon: ShieldAlert,
  },
  cancelada: {
    title: "Licença cancelada",
    msg: "Sua licença foi cancelada. Fale com o suporte para reativar sua conta.",
    badge: "bg-slate-500/30 text-slate-700 border-slate-500/50",
    icon: Ban,
  },
};

const BENEFITS = [
  "PDV completo, delivery, mesas e balcão",
  "Cardápio público com QR Code exclusivo",
  "Gestão de estoque, financeiro e caixa",
  "Suporte técnico oficial da plataforma",
];

export function LicenseGate({ children }: { children: ReactNode }) {
  const { data: roles = [] } = useMyRoles();
  const { data: license, isLoading } = useMyLicense();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Client-side auto-expire: quando o tempo de servidor zera, invalida a query
  const remaining = remainingMs(license);
  useEffect(() => {
    if (!license || license.situacao !== "ativa" || remaining == null || remaining > 0) return;
    const t = setTimeout(() => qc.invalidateQueries({ queryKey: ["my-license"] }), Math.max(0, remaining));
    return () => clearTimeout(t);
  }, [license, remaining, qc]);

  if (isMaster(roles)) return <>{children}</>;
  if (isLoading) return <>{children}</>;

  const rawStatus = (license?.situacao ?? "pendente") as LicenseStatus;
  const expiredByTime = rawStatus === "ativa" && remaining != null && remaining <= 0;
  const status: LicenseStatus = expiredByTime ? "expirada" : rawStatus;
  if (status === "ativa") return <>{children}</>;

  const cfg = CONFIG[status] ?? CONFIG.pendente;
  const Icon = cfg.icon;
  const isTrialExpired = status === "expirada" && (license?.tipo === "trial" || expiredByTime);

  const copyKey = async () => {
    if (!license?.codigo) return;
    await navigator.clipboard.writeText(license.codigo);
    toast.success("Chave copiada");
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl space-y-6 border-border/60 bg-card p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <Badge variant="outline" className={cfg.badge}>{status.toUpperCase()}</Badge>
            <h1 className="mt-1 font-display text-2xl font-bold">{cfg.title}</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{cfg.msg}</p>

        {isTrialExpired && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Plano recomendado</div>
                <div className="mt-1 font-display text-xl font-bold">Profissional</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">R$ 89<span className="text-base font-medium text-muted-foreground">/mês</span></div>
                <div className="text-xs text-muted-foreground">Cancele quando quiser</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {license?.codigo && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Sua chave de licença</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <code className="font-mono text-lg font-semibold text-primary">{license.codigo}</code>
              <Button size="icon" variant="ghost" onClick={copyKey} title="Copiar">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Plano: <span className="text-foreground">{license.plano}</span></div>
              <div>Tipo: <span className="text-foreground">{license.tipo}</span></div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
          <Button asChild variant="ghost">
            <a href="mailto:suporte@lovable.app"><MessageCircle className="mr-2 h-4 w-4" /> Falar com o suporte</a>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground">
            <Link to="/admin/configuracoes/assinatura"><CreditCard className="mr-2 h-4 w-4" /> Assinar agora</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
