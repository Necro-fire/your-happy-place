import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS, SettingsSideNav } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfiguracoesLayout,
});

function ConfiguracoesLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const base = "/admin/configuracoes";
  const isIndex = pathname === base || pathname === `${base}/`;
  const activeIdx = SECTIONS.findIndex((s) => pathname === `${base}/${s.slug}`);
  const active = activeIdx >= 0 ? SECTIONS[activeIdx] : null;
  const prev = activeIdx > 0 ? SECTIONS[activeIdx - 1] : null;
  const next = activeIdx >= 0 && activeIdx < SECTIONS.length - 1 ? SECTIONS[activeIdx + 1] : null;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Desktop title */}
      <div className="mb-4 hidden md:block">
        <h1 className="font-display text-2xl font-bold">Central de Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize o funcionamento do seu estabelecimento. Cada seção controla um módulo do sistema.
        </p>
      </div>

      {/* Mobile header (index): title */}
      {isIndex && (
        <div className="mb-4 md:hidden">
          <h1 className="font-display text-xl font-bold">Configurações</h1>
          <p className="text-xs text-muted-foreground">Escolha uma seção para editar.</p>
        </div>
      )}

      {/* Mobile header (subsection): back / title / next */}
      {!isIndex && active && (
        <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
          <Button variant="ghost" size="icon" asChild aria-label="Voltar">
            <Link to={base}><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate font-display text-base font-semibold">{active.title}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próxima"
            disabled={!next}
            onClick={() => next && navigate({ to: `${base}/${next.slug}` })}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidenav: desktop always; mobile only on index */}
        <div className={isIndex ? "block md:block" : "hidden md:block"}>
          <SettingsSideNav />
        </div>

        {/* Content: desktop always; mobile only on subsection */}
        <div className={`min-w-0 flex-1 ${isIndex ? "hidden md:block" : "block"}`}>
          <Outlet />

          {/* Mobile bottom prev/next */}
          {!isIndex && active && (
            <div className="mt-6 flex items-center justify-between gap-2 md:hidden">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!prev}
                onClick={() => prev && navigate({ to: `${base}/${prev.slug}` })}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> {prev?.title ?? "Anterior"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!next}
                onClick={() => next && navigate({ to: `${base}/${next.slug}` })}
              >
                {next?.title ?? "Próxima"} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
