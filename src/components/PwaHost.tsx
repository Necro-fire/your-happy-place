import { useEffect } from "react";
import { toast } from "sonner";
import { applyPwaUpdate, onPwaUpdateAvailable, registerPwa } from "@/lib/pwa-register";

/**
 * Mount once at the root. Registers the service worker (with strict guards)
 * and shows a toast when a new version is ready to activate.
 */
export function PwaHost() {
  useEffect(() => {
    onPwaUpdateAvailable(() => {
      toast("Nova versão disponível", {
        description: "Atualize para receber as últimas melhorias.",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => applyPwaUpdate(),
        },
      });
    });
    void registerPwa();
  }, []);
  return null;
}
