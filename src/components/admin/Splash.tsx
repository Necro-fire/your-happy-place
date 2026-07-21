import { Loader2, AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Splash({ label = "Carregando o painel..." }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative grid h-14 w-14 place-items-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
        <div className="font-display text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">Isso deve levar apenas alguns segundos.</div>
      </div>
    </div>
  );
}

export function SplashError({
  title = "Não foi possível carregar",
  message = "A conexão demorou mais do que o esperado. Verifique sua internet e tente novamente.",
  onRetry,
  onSignOut,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          )}
          {onSignOut && (
            <Button variant="outline" onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
