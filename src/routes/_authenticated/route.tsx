import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Splash, SplashError } from "@/components/admin/Splash";

const AUTH_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: () => <Splash label="Inicializando sessão..." />,
  beforeLoad: async () => {
    try {
      const { data, error } = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS, "auth-timeout");
      if (error || !data.user) throw redirect({ to: "/auth" });
      return { user: data.user };
    } catch (e: any) {
      if (e?.isRedirect) throw e;
      // Timeout ou falha de rede: força retorno ao login para evitar tela presa.
      throw redirect({ to: "/auth" });
    }
  },
  errorComponent: ErrorBoundary,
  component: () => <Outlet />,
});

function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SplashError
      message={error?.message ?? "Ocorreu um erro ao carregar o painel."}
      onRetry={() => { reset(); router.invalidate(); }}
      onSignOut={async () => { await supabase.auth.signOut(); router.navigate({ to: "/auth", replace: true }); }}
    />
  );
}
