import { useMyLicense, type LicenseStatus } from "@/hooks/use-license";
import { useMyRoles, isMaster } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldAlert, Clock, Ban, LogOut, Copy } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ReactNode } from "react";

const CONFIG: Record<LicenseStatus, { title: string; msg: string; badge: string; icon: typeof Clock }> = {
  pendente: {
    title: "Assinatura aguardando aprovação",
    msg: "Sua conta foi criada com sucesso. O acesso ao painel será liberado assim que o pagamento da assinatura for confirmado pelo nosso time.",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    icon: Clock,
  },
  ativa: { title: "", msg: "", badge: "", icon: KeyRound },
  suspensa: {
    title: "Licença suspensa",
    msg: "Sua licença está temporariamente suspensa. Regularize sua assinatura para reativar o acesso.",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    icon: ShieldAlert,
  },
  bloqueada: {
    title: "Licença bloqueada",
    msg: "O acesso ao painel foi bloqueado. Entre em contato com o suporte para regularizar sua situação.",
    badge: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    icon: Ban,
  },
  expirada: {
    title: "Licença expirada",
    msg: "Sua licença venceu. Renove sua assinatura para continuar utilizando o sistema.",
    badge: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    icon: ShieldAlert,
  },
  cancelada: {
    title: "Licença cancelada",
    msg: "Sua licença foi cancelada. Fale com o suporte para reativar sua conta.",
    badge: "bg-slate-500/30 text-slate-200 border-slate-500/50",
    icon: Ban,
  },
};

export function LicenseGate({ children }: { children: ReactNode }) {
  const { data: roles = [] } = useMyRoles();
  const { data: license, isLoading } = useMyLicense();
  const navigate = useNavigate();

  if (isMaster(roles)) return <>{children}</>;
  if (isLoading) return <>{children}</>;
  if (license?.situacao === "ativa") return <>{children}</>;

  const status = (license?.situacao ?? "pendente") as LicenseStatus;
  const cfg = CONFIG[status] ?? CONFIG.pendente;
  const Icon = cfg.icon;

  const copyKey = async () => {
    if (!license?.codigo) return;
    await navigator.clipboard.writeText(license.codigo);
    toast.success("Chave copiada");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg space-y-5 border-border/60 bg-card p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <Badge variant="outline" className={cfg.badge}>{status.toUpperCase()}</Badge>
            <h1 className="mt-1 font-display text-xl font-bold">{cfg.title}</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{cfg.msg}</p>

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

        <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
          Guarde esta chave. Ela é a sua identificação única na plataforma e será usada pelo suporte para localizar sua conta.
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}
