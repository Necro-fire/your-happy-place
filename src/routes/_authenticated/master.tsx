import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MasterSidebar } from "@/components/master/MasterSidebar";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyRoles, isMaster } from "@/hooks/use-role";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/master")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchMyRoles();
    if (!isMaster(roles)) throw redirect({ to: "/admin" });
  },
  component: MasterLayout,
});

function MasterLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-950">
        <MasterSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur">
            <SidebarTrigger className="text-slate-200 hover:bg-slate-800" />
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-slate-100">Administrador Master</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Gerenciamento da plataforma</span>
            </div>
          </header>
          <main className="flex-1 bg-slate-950 p-4 text-slate-100 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
