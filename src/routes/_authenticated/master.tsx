import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { MasterSidebar } from "@/components/master/MasterSidebar";
import { MasterTopbar } from "@/components/master/MasterTopbar";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyRoles, isMaster } from "@/hooks/use-role";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

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
  useRealtimeSync();
  return (
    <div className="master-saas flex min-h-dvh w-full" style={{ background: "var(--ms-bg)" }}>
      <MasterSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MasterTopbar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

