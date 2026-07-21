import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed-until";

export function PwaInstallFab() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const until = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    setDismissed(Date.now() < until);
  }, []);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-1 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
      <button
        onClick={() => void promptInstall()}
        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <Download className="h-4 w-4" />
        <span>Instalar aplicativo</span>
      </button>
      <button
        aria-label="Dispensar"
        onClick={() => {
          // hide for 7 days
          window.localStorage.setItem(
            DISMISS_KEY,
            String(Date.now() + 7 * 24 * 60 * 60 * 1000),
          );
          setDismissed(true);
        }}
        className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
