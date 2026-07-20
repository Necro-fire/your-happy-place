import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { MasterSidebar } from "@/components/master/MasterSidebar";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyRoles, isMaster } from "@/hooks/use-role";

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
    <div className="master-doodle flex min-h-dvh w-full">
      <MasterSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
