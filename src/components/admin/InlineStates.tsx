import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function InlineLoader({ label = "Carregando...", timeoutMs = 12000, onTimeout }: {
  label?: string;
  timeoutMs?: number;
  onTimeout?: () => void;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setSlow(true); onTimeout?.(); }, timeoutMs);
    return () => clearTimeout(t);
  }, [timeoutMs, onTimeout]);
  return (
    <div className="flex items-center justify-center gap-3 rounded-md border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{slow ? "Está demorando mais do que o esperado..." : label}</span>
    </div>
  );
}

export function InlineError({ error, onRetry, title = "Não foi possível carregar" }: {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-6 text-center">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {error?.message ?? "Verifique sua conexão e tente novamente."}
        </div>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
