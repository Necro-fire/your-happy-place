import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsSideNav } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfiguracoesLayout,
});

function ConfiguracoesLayout() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">Central de Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize o funcionamento do seu estabelecimento. Cada seção controla um módulo do sistema.
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <SettingsSideNav />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
